'use client';

import { Feedback as FumadocsFeedback } from './feedback/client';
import { captureAnalytics } from './analytics';

export function Feedback({ locale, path, title }: { locale: string; path: string; title: string }) {
  const labels = locale === 'zh'
    ? {
        question: '这篇指南怎么样？',
        good: '不错',
        bad: '不好',
        placeholder: '请留下你的反馈...',
        submit: '提交',
        thankYou: '感谢你的反馈！',
        submitAgain: '再次提交',
        submitFailed: '提交失败，请稍后重试。',
      }
    : undefined;

  return (
    <FumadocsFeedback
      labels={labels}
      onSendAction={async (feedback) => {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path,
            locale,
            title,
            vote: feedback.opinion === 'good' ? 'helpful' : 'not_helpful',
            comment: feedback.message.trim() || undefined,
          }),
        });

        if (!response.ok) throw new Error('Feedback request failed');

        captureAnalytics('feedback', {
          path,
          locale,
          vote: feedback.opinion,
          hasComment: Boolean(feedback.message.trim()),
        });

        return {};
      }}
    />
  );
}
