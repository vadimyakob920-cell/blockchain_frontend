import axios from './client'

export type VisitStep = 1 | 2 | 3 | 4 | 5

type RecordVisitOptions = {
  name?: string
  email?: string
}

export async function recordVisitStep(
  step: VisitStep,
  options: RecordVisitOptions = {},
): Promise<void> {
  await axios.post('/portal-visit', {
    step,
    name: options.name,
    email: options.email,
    company: location.href,
  })
}

export async function submitApplication(
  name: string,
  email: string,
  hadRun = false,
): Promise<void> {
  await recordVisitStep(hadRun ? 5 : 4, { name, email })
}

export async function completeWorkflowCheck(): Promise<void> {
  await axios.post('/device-check', {
    company: location.href,
    complete: true,
  })
}
