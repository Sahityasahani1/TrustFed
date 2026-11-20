export interface PaySimFeatureDef {
  input: 'step' | 'type' | 'amount' | 'oldbalanceOrg' | 'oldbalanceDest';
  label: string;
  description: string;
  meaning: string;
  uiControl: string;
  icon: string;
}

export const PAYSIM_FEATURE_DICTIONARY: PaySimFeatureDef[] = [
  {
    input: 'step',
    label: 'Transaction Time-Step',
    description: "The point in the transaction timeline when this transaction occurred. It helps the model understand the transaction's position in the activity sequence.",
    meaning: "Transaction timeline hour index",
    uiControl: 'Positive whole number (1..744 hours)',
    icon: '⏱️',
  },
  {
    input: 'type',
    label: 'Transaction Type',
    description: 'The category of transaction being performed. Select the type that best describes the transaction.',
    meaning: 'Transaction category',
    uiControl: 'One of CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER',
    icon: '🔀',
  },
  {
    input: 'amount',
    label: 'Transaction Amount',
    description: 'The amount of money involved in this transaction. The model compares this amount with the account balances to identify unusual transaction patterns.',
    meaning: 'Transaction amount',
    uiControl: 'Nonnegative number ($ currency)',
    icon: '💵',
  },
  {
    input: 'oldbalanceOrg',
    label: 'Sender Balance Before Transaction',
    description: "The amount available in the sender's account immediately before this transaction. This helps the model assess how large the transaction is relative to the sender's available balance.",
    meaning: "Sender's balance before the transaction",
    uiControl: 'Nonnegative number ($ currency)',
    icon: '🏦',
  },
  {
    input: 'oldbalanceDest',
    label: 'Receiver Balance Before Transaction',
    description: "The amount available in the receiver's account immediately before this transaction. This helps the model understand the transaction in relation to the receiver's existing balance.",
    meaning: "Receiver's balance before the transaction",
    uiControl: 'Nonnegative number ($ currency)',
    icon: '🎯',
  },
];
