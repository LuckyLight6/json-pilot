import {
  AlignLeft,
  Braces,
  FileJson,
  GitCompare,
  Keyboard,
  ShieldCheck,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { Reveal, SectionHeading, trackSpotlight, useSiteCopy } from './primitives'

import { KeyCombo } from '@/components/key-combo'
import { isMacPlatform } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

const IS_MAC = isMacPlatform()

function FeatureCard({
  icon: Icon,
  title,
  body,
  className,
  delay,
  children,
}: {
  icon: LucideIcon
  title: string
  body: string
  className?: string
  delay?: number
  children?: ReactNode
}) {
  return (
    // `min-w-0`: grid items default to their content's width, and the code
    // samples must scroll inside their card rather than widen the page.
    <Reveal className={cn('min-w-0', className)} delay={delay}>
      <article
        onPointerMove={trackSpotlight}
        className="spotlight bg-surface-raised flex h-full flex-col overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-7"
      >
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary ring-primary/15 flex size-9 items-center justify-center rounded-lg ring-1">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <h3 className="font-semibold tracking-tight">{title}</h3>
        </div>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{body}</p>
        {children && <div className="mt-6 flex flex-1 flex-col justify-center">{children}</div>}
      </article>
    </Reveal>
  )
}

/**
 * A static code surface styled like the editor. It never scrolls: a demo
 * with a scrollbar under it looks broken, so long lines fade out instead.
 */
function CodePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-background overflow-hidden rounded-xl border font-mono text-[12.5px] leading-6 whitespace-pre',
        className,
      )}
    >
      {children}
    </div>
  )
}

const P = ({ children }: { children: ReactNode }) => <span className="tok-punctuation">{children}</span>
const K = ({ children }: { children: ReactNode }) => <span className="tok-key">&quot;{children}&quot;</span>
const S = ({ children }: { children: ReactNode }) => <span className="tok-string">&quot;{children}&quot;</span>
const N = ({ children }: { children: ReactNode }) => <span className="tok-number">{children}</span>
/**
 * Leading indentation as an element: inside a flex row a whitespace-only text
 * run is dropped even under `white-space: pre`, which flattened every level.
 */
const Indent = ({ level }: { level: number }) => <span className="whitespace-pre">{'  '.repeat(level)}</span>

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The headline feature, playable in place: the same blue chip the editor
 * draws, toggling a stringified payload in and out of a real structure. It
 * demonstrates itself until the visitor clicks, then hands over control.
 */
function NestedFoldDemo() {
  const copy = useSiteCopy()
  const [expanded, setExpanded] = useState(false)
  const [autoplay, setAutoplay] = useState(true)

  useEffect(() => {
    if (!autoplay || prefersReducedMotion()) return
    const timer = setInterval(() => setExpanded((value) => !value), 2600)
    return () => clearInterval(timer)
  }, [autoplay])

  const toggle = () => {
    setAutoplay(false)
    setExpanded((value) => !value)
  }

  const gutter = (line: number, chip?: ReactNode) => (
    <span className="text-muted-foreground/60 inline-flex w-14 shrink-0 items-center justify-end gap-2 pr-4 select-none">
      <span className="flex w-3.5 justify-center">{chip}</span>
      <span className="w-4 text-right tabular-nums">{line}</span>
    </span>
  )

  return (
    <div className="flex flex-1 flex-col gap-3">
      <CodePanel className="flex-1 pb-4 text-[13px] leading-7 sm:text-sm">
        <div className="text-muted-foreground mb-3 flex items-center gap-2 border-b px-4 py-2 font-sans text-xs">
          <FileJson className="size-3.5" aria-hidden />
          webhook-event.json
        </div>
        <div className="flex">
          {gutter(1)}
          <P>{'{'}</P>
        </div>
        <div className="flex">
          {gutter(2)}
          <Indent level={1} />
          <K>id</K>
          <P>: </P>
          <S>evt_8f21</S>
          <P>,</P>
        </div>
        <div className="flex">
          {gutter(3)}
          <Indent level={1} />
          <K>type</K>
          <P>: </P>
          <S>order.created</S>
          <P>,</P>
        </div>
        <div className="flex">
          {gutter(4)}
          <Indent level={1} />
          <K>receivedAt</K>
          <P>: </P>
          <S>2026-07-26T09:14:03Z</S>
          <P>,</P>
        </div>
        <div className="line-fade flex">
          {gutter(
            5,
            <button
              type="button"
              className="fold-chip"
              data-kind={expanded ? 'collapse' : 'expand'}
              onClick={toggle}
              aria-label={expanded ? copy.features.fold.collapse : copy.features.fold.expand}
              title={expanded ? copy.features.fold.collapse : copy.features.fold.expand}
            />,
          )}
          <Indent level={1} />
          <K>payload</K>
          <P>: </P>
          {expanded ? (
            <P>{'{'}</P>
          ) : (
            <span className="tok-string">
              &quot;{'{\\"orderId\\":\\"A-1093\\",\\"total\\":42.5,\\"currency\\":\\"EUR\\"}'}&quot;
            </span>
          )}
        </div>
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-500 ease-out',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
          aria-hidden={!expanded}
        >
          <div className="overflow-hidden">
            <div className="flex">
              {gutter(6)}
              <Indent level={2} />
              <K>orderId</K>
              <P>: </P>
              <S>A-1093</S>
              <P>,</P>
            </div>
            <div className="flex">
              {gutter(7)}
              <Indent level={2} />
              <K>total</K>
              <P>: </P>
              <N>42.5</N>
              <P>,</P>
            </div>
            <div className="flex">
              {gutter(8)}
              <Indent level={2} />
              <K>currency</K>
              <P>: </P>
              <S>EUR</S>
            </div>
            <div className="flex">
              {gutter(9)}
              <Indent level={1} />
              <P>{'}'}</P>
            </div>
          </div>
        </div>
        <div className="flex">
          {gutter(expanded ? 10 : 6)}
          <P>{'}'}</P>
        </div>
      </CodePanel>
      <p className="text-muted-foreground flex items-center gap-2 px-1 text-xs" aria-live="polite">
        <span className="fold-chip pointer-events-none" data-kind={expanded ? 'collapse' : 'expand'} aria-hidden />
        {expanded ? copy.features.fold.collapse : copy.features.fold.expand}
      </p>
    </div>
  )
}

function QueryDemo() {
  const copy = useSiteCopy()
  return (
    <div className="space-y-3">
      <div className="bg-muted/60 flex h-10 items-center gap-2 rounded-xl px-1.5">
        <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-[10px]">JSONPath</span>
        <span className="truncate font-mono text-[12.5px]">$.users[?(@.active)].name</span>
      </div>
      <CodePanel className="px-4 py-3">
        <span className="text-muted-foreground font-sans text-[11px] font-medium tracking-wider uppercase">
          {copy.features.query.result}
        </span>
        {'\n'}
        <P>[</P>
        <S>ada</S>
        <P>, </P>
        <S>cy</S>
        <P>]</P>
      </CodePanel>
    </div>
  )
}

function CompareDemo() {
  const copy = useSiteCopy()
  const pane = (title: string, lines: { text: ReactNode; change?: 'removed' | 'added' }[]) => (
    <div className="min-w-0 flex-1">
      <div className="text-muted-foreground border-b px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase">
        {title}
      </div>
      <div className="py-1.5">
        {lines.map((line, index) => (
          <div
            key={index}
            className={cn(
              'px-3',
              line.change === 'removed' && 'bg-red-500/12 dark:bg-red-500/15',
              line.change === 'added' && 'bg-emerald-500/12 dark:bg-emerald-500/15',
            )}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <CodePanel className="flex divide-x">
      {pane(copy.features.compare.before, [
        { text: <><K>plan</K><P>: </P><S>free</S></>, change: 'removed' },
        { text: <><K>seats</K><P>: </P><N>3</N></> },
        { text: <><K>trial</K><P>: </P><span className="tok-literal">true</span></>, change: 'removed' },
      ])}
      {pane(copy.features.compare.after, [
        { text: <><K>plan</K><P>: </P><S>pro</S></>, change: 'added' },
        { text: <><K>seats</K><P>: </P><N>3</N></> },
        { text: <><K>trial</K><P>: </P><span className="tok-literal">false</span></>, change: 'added' },
      ])}
    </CodePanel>
  )
}

const TRANSFORM_BINDINGS = ['Alt+Shift+F', 'Alt+Shift+M', 'Alt+Shift+S', 'Alt+Shift+E', 'Alt+Shift+U']

function TransformDemo() {
  const copy = useSiteCopy()
  return (
    <div className="flex flex-wrap gap-2">
      {copy.features.transform.actions.map((action, index) => (
        <span
          key={action}
          className={cn(
            'flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs',
            index < 2 ? 'bg-primary/10 text-primary border-primary/20 font-medium' : 'bg-background',
          )}
        >
          {action}
          <KeyCombo binding={TRANSFORM_BINDINGS[index]} />
        </span>
      ))}
    </div>
  )
}

function KeyboardDemo() {
  const keys = IS_MAC ? ['⌥', '⇧', 'F'] : ['Alt', 'Shift', 'F']
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {keys.map((key, index) => (
        <span key={key} className="flex items-center gap-2">
          {index > 0 && <span className="text-muted-foreground/60 text-sm">+</span>}
          <kbd className="keycap">{key}</kbd>
        </span>
      ))}
    </div>
  )
}

function PrivacyDemo() {
  return (
    <div className="relative flex items-center justify-center py-4" aria-hidden>
      <span className="bg-primary/5 absolute size-28 rounded-full" />
      <span className="bg-primary/10 absolute size-20 rounded-full" />
      <span className="bg-primary text-primary-foreground relative flex size-12 items-center justify-center rounded-2xl shadow-lg">
        <ShieldCheck className="size-6" />
      </span>
    </div>
  )
}

export function Features() {
  const copy = useSiteCopy()
  const { features } = copy

  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
      <SectionHeading eyebrow={features.eyebrow} title={features.title} subtitle={features.subtitle} />

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <FeatureCard
          icon={Braces}
          title={features.fold.title}
          body={features.fold.body}
          className="md:col-span-4 md:row-span-2"
        >
          <NestedFoldDemo />
        </FeatureCard>
        <FeatureCard
          icon={SquareTerminal}
          title={features.query.title}
          body={features.query.body}
          className="md:col-span-2"
          delay={80}
        >
          <QueryDemo />
        </FeatureCard>
        <FeatureCard
          icon={GitCompare}
          title={features.compare.title}
          body={features.compare.body}
          className="md:col-span-2"
          delay={160}
        >
          <CompareDemo />
        </FeatureCard>
        <FeatureCard
          icon={AlignLeft}
          title={features.transform.title}
          body={features.transform.body}
          className="md:col-span-2"
        >
          <TransformDemo />
        </FeatureCard>
        <FeatureCard
          icon={Keyboard}
          title={features.keyboard.title}
          body={features.keyboard.body}
          className="md:col-span-2"
          delay={80}
        >
          <KeyboardDemo />
        </FeatureCard>
        <FeatureCard
          icon={ShieldCheck}
          title={features.privacy.title}
          body={features.privacy.body}
          className="md:col-span-2"
          delay={160}
        >
          <PrivacyDemo />
        </FeatureCard>
      </div>
    </section>
  )
}
