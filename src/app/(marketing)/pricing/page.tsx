import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { PLAN_DEFINITIONS } from "@/config/plans";

/** Tarifs — Student / Premium / Center, depuis config/plans.ts. */
export default function PricingPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Preise</h1>
      <p className="mt-2 max-w-xl text-[14px] text-muted">
        Der Demo-Modelltest ist kostenlos — Konto erstellen und sofort unter
        Prüfungsbedingungen üben. Für das volle Angebot:
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLAN_DEFINITIONS.map((plan) => (
          <Card
            key={plan.id}
            className={
              "flex flex-col p-5 " +
              (plan.highlighted ? "border-accent" : "")
            }
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">{plan.name}</h2>
              {plan.highlighted ? (
                <span className="border border-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent rounded-sm">
                  Empfohlen
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-muted">{plan.description}</p>
            <p className="mt-4 text-2xl font-semibold tabular-nums">
              {plan.price}
              <span className="ml-1 text-[12px] font-normal text-muted">
                {plan.period}
              </span>
            </p>
            <ul className="mt-4 flex-1 space-y-1.5 border-t border-border pt-4">
              {plan.features.map((feature) => (
                <li key={feature} className="text-[13px] leading-snug">
                  · {feature}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Link href={plan.cta.href}>
                <Button
                  variant={plan.highlighted ? "primary" : "secondary"}
                  className="w-full"
                >
                  {plan.cta.label}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-[12px] text-muted">
        Die Planzuweisung erfolgt derzeit über die Administration — Zahlung
        auf Rechnung. Online-Zahlung folgt.
      </p>
    </section>
  );
}
