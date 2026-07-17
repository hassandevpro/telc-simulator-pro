import { Card } from "@/components/ui";
import { PlanCheckout } from "@/components/marketing/PlanCheckout";
import { CenterPurchase } from "@/components/marketing/CenterPurchase";
import { PLAN_DEFINITIONS } from "@/config/plans";
import { CENTER_SEAT_PRICE, PLAN_PRICES, type PayablePlan } from "@/config/pricing";
import { WHATSAPP_DISPLAY, whatsappLink } from "@/config/contact";

/** Prix EUR (secondaire) d'un plan, formaté « 9,90 € ». */
function eurLabel(id: string): string {
  const eur =
    id === "CENTER" ? CENTER_SEAT_PRICE.eur : PLAN_PRICES[id as PayablePlan]?.eur;
  return eur === undefined ? "" : `${eur.toFixed(2).replace(".", ",")} €`;
}

/** Tarifs — Student / Premium / Center, depuis config/plans.ts. */
export default function PricingPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Preise</h1>
      <p className="mt-2 max-w-xl text-[14px] text-muted">
        Kostenlos starten mit 2 Gratis-Credits — Konto erstellen und sofort
        unter Prüfungsbedingungen üben. 1 Credit = 1 komplette Prüfung; bereits
        absolvierte Prüfungen wiederholen Sie ohne Credit. Für mehr:
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
            <p className="text-[12px] text-muted">≈ {eurLabel(plan.id)}</p>
            <ul className="mt-4 flex-1 space-y-1.5 border-t border-border pt-4">
              {plan.features.map((feature) => (
                <li key={feature} className="text-[13px] leading-snug">
                  · {feature}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              {plan.id === "STUDENT" || plan.id === "PREMIUM" ? (
                <PlanCheckout plan={plan.id as PayablePlan} />
              ) : (
                <CenterPurchase />
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 border-accent p-4">
        <div>
          <p className="text-[14px] font-semibold">Lieber per WhatsApp bezahlen?</p>
          <p className="mt-0.5 text-[13px] text-muted">
            Schreiben Sie uns für den Pro-Zugang direkt auf WhatsApp:{" "}
            <span className="whitespace-nowrap font-medium">{WHATSAPP_DISPLAY}</span>
          </p>
        </div>
        <a
          href={whatsappLink(
            "Hallo, ich möchte den Pro-Zugang für den telc-Simulator kaufen.",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-white"
        >
          Auf WhatsApp schreiben
        </a>
      </Card>

      <p className="mt-6 text-[12px] text-muted">
        Bezahlung per Karte (weltweit, via Stripe), Mobile Money in Afrika
        (u. a. Kamerun MTN/Orange, via Flutterwave) oder per WhatsApp. Der
        Zugang wird nach erfolgreicher Zahlung für 30 Tage freigeschaltet.
      </p>
    </section>
  );
}
