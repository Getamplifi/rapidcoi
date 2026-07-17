export const POLICY_TYPES = [
  {
    key: 'general_liability',
    label: 'General Liability',
    limitFields: [
      { name: 'each_occurrence_limit', label: 'Each Occurrence' },
      { name: 'general_aggregate_limit', label: 'General Aggregate' },
      { name: 'products_completed_ops_limit', label: 'Products/Completed Ops' },
      { name: 'personal_injury_limit', label: 'Personal & Advertising Injury' },
    ],
    hasEndorsements: true,
  },
  {
    key: 'auto',
    label: 'Commercial Auto',
    limitFields: [{ name: 'combined_single_limit', label: 'Combined Single Limit' }],
    hasEndorsements: false,
  },
  {
    key: 'umbrella',
    label: 'Umbrella / Excess',
    limitFields: [
      { name: 'umbrella_each_occurrence', label: 'Each Occurrence' },
      { name: 'umbrella_aggregate', label: 'Aggregate' },
    ],
    hasEndorsements: false,
  },
  {
    key: 'workers_comp',
    label: "Workers' Compensation",
    limitFields: [
      { name: 'wc_each_accident', label: 'Each Accident' },
      { name: 'wc_disease_policy_limit', label: 'Disease - Policy Limit' },
      { name: 'wc_disease_each_employee', label: 'Disease - Each Employee' },
    ],
    hasEndorsements: false,
  },
]

export function emptyPolicy() {
  return {
    carrier_name: '',
    naic_number: '',
    policy_number: '',
    effective_date: '',
    expiration_date: '',
    additional_insured: false,
    waiver_of_subrogation: false,
    primary_noncontributory: false,
  }
}
