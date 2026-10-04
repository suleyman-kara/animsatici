"use client";

import { track } from "@/lib/track";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; data?: Record<string, string | number | boolean> };

/** Tıklandığında Umami olayı gönderen dış link. */
export function TrackedLink({ event, data, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(ev) => {
        track(event, data);
        onClick?.(ev);
      }}
    />
  );
}
