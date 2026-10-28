#!/bin/sh
# 由 GitHub Actions 通过阿里云云助手 RunCommand 在 ECS 上执行。
# 依赖：docker、curl；运行时配置放在 /etc/stationnas-docs.env（root 600）。
#
# 环境变量：
#   IMAGE     必填。完整镜像地址（由 workflow 注入到脚本开头）。
#   ENV_FILE  可选。运行时环境变量文件，默认 /etc/stationnas-docs.env。
set -eu

IMAGE="${IMAGE:?IMAGE is required}"
ENV_FILE="${ENV_FILE:-/etc/stationnas-docs.env}"
CONTAINER="stationnas-docs"
REPO="ghcr.io/stationpc-technology/stationospro-docs"
HEALTH_URL="http://127.0.0.1:3000/"
TAG="${IMAGE##*:}"

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found"; exit 1; }
[ -r "$ENV_FILE" ] || { echo "ERROR: $ENV_FILE not readable"; exit 1; }

for key in FEEDBACK_API_URL FEEDBACK_API_TOKEN; do
  grep -Eq "^${key}=" "$ENV_FILE" || { echo "ERROR: missing $key in $ENV_FILE"; exit 1; }
done

# 记录旧镜像，健康检查失败时回滚
PREV_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || true)"

echo "==> Pulling $IMAGE"
docker pull "$IMAGE"

echo "==> Replacing container"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

start_container() {
  docker run -d --name "$CONTAINER" \
    --restart unless-stopped \
    -p 127.0.0.1:3000:3000 \
    --env-file "$ENV_FILE" \
    --label "deploy.sha=$1" \
    "$2" >/dev/null
}

if ! start_container "$TAG" "$IMAGE"; then
  echo "ERROR: failed to start $IMAGE"
  if [ -n "$PREV_IMAGE" ]; then
    echo "==> Rolling back to $PREV_IMAGE"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    start_container "${PREV_IMAGE##*:}" "$PREV_IMAGE" || true
  fi
  exit 1
fi

echo "==> Waiting for health check"
OK=0
i=1
while [ "$i" -le 30 ]; do
  if curl -fsSL --noproxy '*' --max-time 5 -o /dev/null "$HEALTH_URL"; then
    OK=1
    break
  fi
  sleep 2
  i=$((i + 1))
done

if [ "$OK" -ne 1 ]; then
  echo "ERROR: health check failed after 60s"
  docker logs --tail 100 "$CONTAINER" 2>&1 || true
  if [ -n "$PREV_IMAGE" ]; then
    echo "==> Rolling back to $PREV_IMAGE"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    start_container "${PREV_IMAGE##*:}" "$PREV_IMAGE" || true
    sleep 5
    if curl -fsSL --noproxy '*' --max-time 5 -o /dev/null "$HEALTH_URL"; then
      echo "Rollback container is healthy"
    else
      echo "WARNING: rollback container is not healthy"
    fi
  else
    echo "WARNING: no previous image to roll back to"
  fi
  exit 1
fi

echo "Health check passed"
docker ps --filter "name=^/${CONTAINER}$" --format '{{.Status}}' || true

# 清理旧镜像：保留最近 5 个 sha 镜像；latest 不受影响
docker image ls "$REPO" --format '{{.CreatedAt}}|{{.ID}}|{{.Tag}}' \
  | grep -v '|latest$' \
  | sort -r \
  | tail -n +6 \
  | cut -d'|' -f3 \
  | sed "s#^#$REPO:#" \
  | xargs -r -n1 docker rmi || true

echo "Deploy finished: $IMAGE"
