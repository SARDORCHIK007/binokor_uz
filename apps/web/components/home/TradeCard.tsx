import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { TradeBanner } from "@/components/home/TradeMark";

export function TradeCard({
  code,
  name,
  months,
  groups,
  index,
  text,
}: {
  code: string;
  name: string;
  months: number;
  groups: number;
  index: number;
  text?: string;
}) {
  return (
    <Link href={`/kasblar/${code}`} className="group block h-full overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(7,24,51,0.08)] transition-shadow hover:shadow-[0_14px_36px_rgba(7,24,51,0.16)] focus-visible:outline-2 focus-visible:outline-[#2F6BFF]">
      <TradeBanner code={code} index={index} />
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-[#071833]">{name}</h3>
          {text ? <p className="mt-1 text-sm text-[#5f6b7d]">{text}</p> : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#5f6b7d]">
            <span className="inline-flex items-center gap-1"><Icon name="clock" className="size-4" />{months} oy</span>
            <span className="inline-flex items-center gap-1"><Icon name="users" className="size-4" />{groups} guruh</span>
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2F6BFF] text-white transition-transform group-hover:translate-x-0.5">
          <Icon name="arrow" className="size-5" />
        </span>
      </div>
    </Link>
  );
}
