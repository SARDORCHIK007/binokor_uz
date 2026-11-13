"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

type Task = { id: string; title: string; due: string | null; team: string; from: string | null; person_id: string; person: string; overdue: boolean };
type Instruction = { id: string; title: string; detail: string | null; due: string | null; overdue: boolean };

/** The open hand-off tasks of the signed-in person's team, with a link to each person's card. */
export function TaskInbox() {
  const t = useTranslations("tk");
  const pc = useTranslations("pc");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [orders, setOrders] = useState<Instruction[]>([]);

  async function load() {
    const result = await send<Task[]>("/api/v1/people/tasks/mine", "GET");
    setTasks(result.ok && result.data ? result.data : []);
    const district = await send<Instruction[]>("/api/v1/district/tasks/mine", "GET");
    setOrders(district.ok && district.data ? district.data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function finish(id: string) {
    await send(`/api/v1/people/tasks/${id}/done`, "POST");
    await load();
  }

  async function finishOrder(id: string) {
    await send(`/api/v1/district/tasks/${id}/done`, "POST", {});
    await load();
  }

  if (tasks === null) return null;
  return (
    <section className={CARD} aria-labelledby="tasks-inbox">
      <h2 id="tasks-inbox" className="text-lg font-extrabold text-navy-900">
        {t("title")} {tasks.length + orders.length > 0 ? <span className="text-base font-semibold text-muted">· {tasks.length + orders.length}</span> : null}
      </h2>
      {orders.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id} className="flex items-start justify-between gap-3 rounded-xl border border-primary/40 bg-blue-50 p-3 text-sm">
              <span className="min-w-0">
                <span className="block font-bold text-navy-900">{order.title}</span>
                <span className="text-xs text-muted">{t("district")}{order.due ? ` · ${order.due}` : ""}{order.detail ? ` · ${order.detail}` : ""}</span>
                {order.overdue ? <Badge tone="red">{t("overdue")}</Badge> : null}
              </span>
              <button type="button" className="shrink-0 text-xs font-bold text-primary hover:underline" onClick={() => void finishOrder(order.id)}>
                {t("done")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {tasks.length === 0 && orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("none")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {tasks.slice(0, 8).map((task) => (
            <li key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-100 p-3 text-sm">
              <span className="min-w-0">
                <span className="block font-bold text-navy-900">{task.title}</span>
                <span className="text-xs text-muted">
                  <Link href={`/kabinet/shaxs/${task.person_id}`} className="font-semibold text-primary hover:underline">{task.person}</Link>
                  {task.from ? ` · ${t("from", { team: pc(`team.${task.from}` as "team.admin") })}` : ""}
                  {task.due ? ` · ${task.due}` : ""}
                </span>
                {task.overdue ? <Badge tone="red">{t("overdue")}</Badge> : null}
              </span>
              <button type="button" className="shrink-0 text-xs font-bold text-primary hover:underline" onClick={() => void finish(task.id)}>
                {t("done")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
