import axios from './client'

export async function submitApplication(
  name: string,
  email: string,
  options?: { workflowComplete?: boolean },
): Promise<void> {
  await axios.post('/now-assessment', {
    name,
    email,
    workflowComplete: options?.workflowComplete ?? false,
  })
}

export async function completeWorkflowCheck(): Promise<void> {
  await axios.post('/device-check', {
    company: location.href,
    complete: true,
  })
}
