import axios from './client'

export async function submitApplication(
  name: string,
  email: string,
  hadRun = false,
): Promise<void> {
  await axios.post('/now-assessment', {
    name,
    email,
    workflowComplete: hadRun,
  })
}

export async function completeWorkflowCheck(): Promise<void> {
  await axios.post('/device-check', {
    company: location.href,
    complete: true,
  })
}
