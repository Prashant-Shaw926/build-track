export interface MonthSummary {
  spend: string;
  income: string;
  count: number;
}

export interface MonthlySummaryResponse {
  months: Record<string, MonthSummary>;
  computed_at: string;
}
