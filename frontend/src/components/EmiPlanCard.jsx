function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

export default function EmiPlanCard({ plan, selected, onSelect }) {
  return (
    <button type="button" className={`emi-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(plan.id)}>
      <div className="emi-radio" aria-hidden="true">{selected && <span />}</div>
      <div className="emi-main">
        <div className="emi-amount">{formatINR(plan.monthlyPayment)}</div>
        <div className="emi-tenure">× {plan.tenure} months</div>
      </div>
      <div className="emi-rate">{plan.label}</div>
      <div className="emi-provider">{plan.financingProgram} · {plan.emiType === 'NO_COST' ? 'No-cost offer' : 'Regular EMI'}</div>
      {plan.cashback > 0 && <div className="cashback">Additional cashback of {formatINR(plan.cashback)}</div>}
      {plan.processingFee > 0 && <div className="fee-note">Processing fee {formatINR(plan.processingFee)}</div>}
    </button>
  );
}
