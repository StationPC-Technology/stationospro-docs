'use client';

import { cn } from '../../lib/cn';
import { buttonVariants } from '../ui/button';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { type SyntheticEvent, useEffect, useEffectEvent, useState, useTransition } from 'react';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import { cva } from 'class-variance-authority';
import { actionResponse, pageFeedback, type ActionResponse, type PageFeedback } from './schema';
import { z } from 'zod/mini';
import { usePathname } from 'fumadocs-core/framework';

const rateButtonVariants = cva(
  'inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium border text-sm [&_svg]:size-4 disabled:cursor-not-allowed',
  { variants: { active: { true: 'bg-fd-accent text-fd-accent-foreground [&_svg]:fill-current', false: 'text-fd-muted-foreground' } } },
);

const pageFeedbackResult = z.extend(pageFeedback, { response: actionResponse });

export interface FeedbackLabels {
  question: string;
  good: string;
  bad: string;
  placeholder: string;
  submit: string;
  thankYou: string;
  submitAgain: string;
  submitFailed: string;
}

const defaultLabels: FeedbackLabels = {
  question: 'How is this guide?', good: 'Good', bad: 'Bad', placeholder: 'Leave your feedback...',
  submit: 'Submit', thankYou: 'Thank you for your feedback!', submitAgain: 'Submit Again',
  submitFailed: 'Could not send your feedback. Please try again.',
};

export function Feedback({ onSendAction, labels = defaultLabels }: {
  onSendAction: (feedback: PageFeedback) => Promise<ActionResponse>;
  labels?: FeedbackLabels;
}) {
  const pathname = usePathname();
  const { previous, setPrevious } = useSubmissionStorage(pathname, (value) => {
    const result = pageFeedbackResult.safeParse(value);
    return result.success ? result.data : null;
  });
  const [opinion, setOpinion] = useState<'good' | 'bad' | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (opinion == null) return;
    startTransition(async () => {
      const feedback: PageFeedback = { url: location.href, opinion, message };
      try {
        const response = await onSendAction(feedback);
        setPrevious({ response, ...feedback });
        setMessage('');
        setOpinion(null);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  }

  const activeOpinion = previous?.opinion ?? opinion;
  return (
    <Collapsible open={opinion !== null || previous !== null} onOpenChange={(open) => { if (!open) setOpinion(null); }} className="border-y py-3">
      <div className="flex flex-row flex-wrap items-center gap-2">
        <p className="text-sm font-medium pe-2">{labels.question}</p>
        <button type="button" disabled={previous !== null} className={cn(rateButtonVariants({ active: activeOpinion === 'good' }))} onClick={() => setOpinion('good')}>
          <ThumbsUp />{labels.good}
        </button>
        <button type="button" disabled={previous !== null} className={cn(rateButtonVariants({ active: activeOpinion === 'bad' }))} onClick={() => setOpinion('bad')}>
          <ThumbsDown />{labels.bad}
        </button>
      </div>
      <CollapsibleContent className="mt-3">
        {previous ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-fd-card px-3 py-6 text-center text-sm text-fd-muted-foreground">
            <p>{labels.thankYou}</p>
            <button type="button" className={cn(buttonVariants({ color: 'secondary' }), 'text-xs')} onClick={() => { setOpinion(previous.opinion); setPrevious(null); }}>
              {labels.submitAgain}
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <textarea autoFocus required value={message} onChange={(event) => { setMessage(event.target.value); setFailed(false); }} className="resize-none rounded-lg border bg-fd-secondary p-3 text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none" placeholder={labels.placeholder} maxLength={2000} onKeyDown={(event) => { if (!event.shiftKey && event.key === 'Enter') submit(event); }} />
            {failed && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{labels.submitFailed}</p>
            )}
            <button type="submit" className={cn(buttonVariants({ color: 'outline' }), 'w-fit px-3')} disabled={isPending}>{labels.submit}</button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function useSubmissionStorage<Result>(key: string, validate: (value: unknown) => Result | null) {
  const storageKey = `docs-feedback-${key}`;
  const [value, setValue] = useState<Result | null>(null);
  const validateCallback = useEffectEvent(validate);
  useEffect(() => {
    const item = localStorage.getItem(storageKey);
    if (item === null) return;
    const validated = validateCallback(JSON.parse(item));
    if (validated !== null) setValue(validated);
  }, [storageKey]);
  return {
    previous: value,
    setPrevious(result: Result | null) {
      if (result) localStorage.setItem(storageKey, JSON.stringify(result));
      else localStorage.removeItem(storageKey);
      setValue(result);
    },
  };
}
