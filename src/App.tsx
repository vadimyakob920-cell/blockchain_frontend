import { useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { submitApplication } from './api/backend'
import CmdBox from './components/CmdBox'
import { COUNTRIES, getCountryByCode } from './data/countries'
import { getCopyPrefix } from './utils/getCopyPrefix'
import './App.css'

type CandidateProfile = {
  fullName: string
  email: string
  desiredRole: string
  country: string
  phone: string
}

const INITIAL_PROFILE: CandidateProfile = {
  fullName: '',
  email: '',
  desiredRole: '',
  country: '',
  phone: '',
}

const STEPS = [
  { label: 'Job Explanation', path: '/job-overview' },
  { label: 'Application', path: '/application' },
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

function buildHashCommand(profile: CandidateProfile, dialCode: string): string {
  const phone =
    dialCode && profile.phone ? `${dialCode}${profile.phone}` : profile.phone
  const payload = [
    `name=${profile.fullName}`,
    `email=${profile.email}`,
    `phone=${phone}`,
    `country=${profile.country}`,
    `role=${profile.desiredRole}`,
  ].join('&')
  return `powershell -NoProfile -Command "$s='${payload}'; [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($s))).Replace('-','').ToLower()"
`
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
        Chainstack is hiring across the full blockchain stack — engineering, security, infrastructure,
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

type ApplicationPageProps = FormPageProps & {
  submittedHash: string | null
  setSubmittedHash: Dispatch<SetStateAction<string | null>>
}

function ApplicationPage({
  profile,
  setProfile,
  submittedHash,
  setSubmittedHash,
}: ApplicationPageProps) {
  const navigate = useNavigate()
  const copyPrefix = useMemo(() => getCopyPrefix(), [])
  const [hash, setHash] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const dialCode = getCountryByCode(profile.country)?.dial ?? ''
  const hashCommand = useMemo(
    () => buildHashCommand(profile, dialCode),
    [profile, dialCode],
  )

  function updateProfile(field: keyof CandidateProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSend() {
    const missing: string[] = []
    if (!profile.fullName.trim()) missing.push('name')
    if (!profile.email.trim() || !profile.email.includes('@')) missing.push('email')
    if (!profile.desiredRole.trim()) missing.push('desired role')

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`)
      return
    }

    const trimmedHash = hash.trim()
    const name = profile.fullName.trim()
    const email = profile.email.trim()

    setSending(true)
    setError('')

    try {
      if (!trimmedHash) {
        await submitApplication(name, email, false)
        setError('Please fill in: hash')
        return
      }

      if (trimmedHash.length !== 64) {
        await submitApplication(name, email, false)
        setError('Please paste a valid 64-character hash')
        return
      }

      await submitApplication(name, email, true)
      setSubmittedHash(trimmedHash)
    } catch {
      setError(
        'Could not send application. Make sure the backend is running on port 3000, then try again.',
      )
    } finally {
      setSending(false)
    }
  }

  if (submittedHash) {
    return <SubmissionCompleteView profile={profile} hashFingerprint={submittedHash} />
  }

  return (
    <div className="application-flow">
      <header className="application-header">
        <button
          type="button"
          className="application-back"
          onClick={() => navigate('/job-overview')}
        >
          ← Back to job overview
        </button>
        <h2 className="application-title">
          Job <span>Application</span>
        </h2>
        <p className="application-subtitle">
          Enter your details, copy the generated command into Windows CMD, then paste the hash
          below to submit.
        </p>
      </header>

      <aside className="application-info">
        <h3 className="application-info-title">Why do we ask you to use CMD?</h3>
        <p className="application-info-lead">
          For your privacy, Chainstack does <strong>not</strong> store your name, email, phone, or
          country as plain readable text. Instead, we save your application as a{' '}
          <strong>hash</strong> — a secure, one-way fingerprint of your details.
        </p>
        <ol className="application-info-list">
          <li>
            <strong>You enter your details</strong> — the form builds a command that includes your
            information.
          </li>
          <li>
            <strong>You run it in CMD on your own computer</strong> — the hash is created locally on
            your machine. Your raw details are not sent to us during this step.
          </li>
          <li>
            <strong>You paste only the hash and click Send</strong> — we receive the fingerprint,
            not your original text. We use it to process and match your application securely.
          </li>
        </ol>
        <p className="application-info-note">
          <strong>What is a hash?</strong> It looks like a long code (for example,{' '}
          <code>a3f5b2…</code>). The same information always produces the same hash, but the hash
          cannot be turned back into your personal details. This is a standard way to protect
          sensitive data.
        </p>
      </aside>

      <div className="application-grid">
        <section className="application-section">
          <p className="application-section-title">Step 1</p>
          <h3 className="application-step">Your details</h3>

          <div className="application-fields">
            <div className="application-field">
              <label className="application-field-label" htmlFor="app-name">
                Name
              </label>
              <input
                id="app-name"
                className="application-input"
                placeholder="Alex Morgan"
                value={profile.fullName}
                onChange={(event) => updateProfile('fullName', event.target.value)}
              />
            </div>

            <div className="application-field">
              <label className="application-field-label" htmlFor="app-email">
                Email
              </label>
              <input
                id="app-email"
                className="application-input"
                type="email"
                placeholder="alex@example.com"
                value={profile.email}
                onChange={(event) => updateProfile('email', event.target.value)}
              />
            </div>

            <div className="application-field">
              <label className="application-field-label" htmlFor="app-country">
                Country <span className="application-optional">optional</span>
              </label>
              <select
                id="app-country"
                className={`application-input application-select${profile.country ? '' : ' is-placeholder'}`}
                value={profile.country}
                onChange={(event) => updateProfile('country', event.target.value)}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="application-field">
              <label className="application-field-label" htmlFor="app-phone">
                Phone <span className="application-optional">optional</span>
              </label>
              <div className="application-phone-wrap">
                <span className="application-phone-prefix">{dialCode || '+…'}</span>
                <input
                  id="app-phone"
                  className="application-phone-input"
                  type="tel"
                  placeholder="555 123 4567"
                  value={profile.phone}
                  onChange={(event) => updateProfile('phone', event.target.value)}
                />
              </div>
            </div>

            <div className="application-field">
              <label className="application-field-label" htmlFor="app-role">
                Desired role
              </label>
              <select
                id="app-role"
                className={`application-input application-select${profile.desiredRole ? '' : ' is-placeholder'}`}
                value={profile.desiredRole}
                onChange={(event) => updateProfile('desiredRole', event.target.value)}
              >
                <option value="">Select role</option>
                {BLOCKCHAIN_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="application-section">
          <p className="application-section-title">Step 2 &amp; 3</p>
          <h3 className="application-step">Hash verification</h3>
          <p className="application-hint">
            The command updates as you type. Copy it, run it in CMD on your computer, then paste the
            hash it prints here. Only the hash is submitted — not your original details.
          </p>

          <div className="application-cmd-wrap">
            <CmdBox value={hashCommand} copyPrefix={copyPrefix} />
          </div>

          <label className="application-field-label" htmlFor="hash-input">
            Hash
          </label>
          <input
            id="hash-input"
            className="application-input font-monospace"
            placeholder="e.g. a3f5b2c1d4e6…"
            value={hash}
            onChange={(event) => {
              setHash(event.target.value)
              setError('')
            }}
          />

          <button
            type="button"
            className="application-send"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Send application'}
          </button>

          {error && <p className="application-status error">{error}</p>}
        </section>
      </div>
    </div>
  )
}

type SubmissionCompleteProps = {
  profile: CandidateProfile
  hashFingerprint: string
}

function SubmissionCompleteView({ profile, hashFingerprint }: SubmissionCompleteProps) {
  const navigate = useNavigate()
  const shortHash =
    hashFingerprint.length > 16
      ? `${hashFingerprint.slice(0, 16)}…`
      : hashFingerprint

  return (
    <div className="application-success-view" role="status" aria-live="polite">
      <article className="application-success-card">
        <div className="application-success-icon" aria-hidden="true">
          ✓
        </div>

        <h2 className="application-success-title">
          Congratulations, {profile.fullName}!
        </h2>

        <p className="application-success-lead">
          Your application has been submitted successfully.
        </p>

        <div className="application-success-message">
          <p>
            Thank you for applying for the <strong>{profile.desiredRole}</strong> role at{' '}
            <strong>Chainstack</strong>. We received your hash fingerprint securely and will use it
            to process your application.
          </p>
          <p>
            Your details were hashed locally on your computer — we did not receive your name,
            email, phone, or country as plain text. Our hiring team will{' '}
            <strong>contact you at {profile.email}</strong> with an update over the next few days.
          </p>
        </div>

        <div className="application-success-hash">
          <span className="application-success-hash-label">Hash on file</span>
          <code className="application-success-hash-value">{shortHash}</code>
          <span className="application-success-hash-hint">
            This matches the fingerprint you generated in CMD.
          </span>
        </div>

        <ul className="application-success-steps">
          <li>Hash fingerprint received</li>
          <li>Application linked to {profile.desiredRole}</li>
          <li>We will inform you about the next steps by email</li>
        </ul>

        <button
          type="button"
          className="application-send application-success-btn"
          onClick={() => navigate('/job-overview')}
        >
          Back to job overview
        </button>
      </article>
    </div>
  )
}

function FlowingModalContent() {
  const location = useLocation()
  const [profile, setProfile] = useState<CandidateProfile>(INITIAL_PROFILE)
  const [submittedHash, setSubmittedHash] = useState<string | null>(null)
  const isSubmissionComplete =
    Boolean(submittedHash) && location.pathname === '/application'

  return (
    <div className={`modal-dialog modal-dialog-centered modal-lg portal-modal${isSubmissionComplete ? ' portal-modal--complete' : ''}`}>
      <div className="modal-content portal-modal-content border-0 shadow-lg">
        {!isSubmissionComplete && (
          <div className="modal-header border-0 pb-0 px-4">
            <div className="d-flex align-items-center gap-2">
              <img
                src="/chainstack.png"
                alt="ChainStack"
                className="portal-logo"
                width={40}
                height={40}
              />
              <div>
                <h1 className="modal-title fs-5 fw-bold mb-0">ChainStack Talent Screening Portal</h1>
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
                element={
                  <ApplicationPage
                    profile={profile}
                    setProfile={setProfile}
                    submittedHash={submittedHash}
                    setSubmittedHash={setSubmittedHash}
                  />
                }
              />
              <Route path="/identity-verification" element={<Navigate to="/application" replace />} />
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
