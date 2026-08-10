import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Bot, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-200 px-6 sm:px-12">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Bot size={20} />
          </div>
          <span>Job Auto Apply AI</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Apply to the right jobs, <span className="text-blue-600">automatically.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Paste your WhatsApp job alerts, let AI match them against your resume, and manage applications from one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/login">
              <Button size="lg" className="text-base">Get Started</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="text-base">View Dashboard</Button>
            </Link>
          </div>
        </section>

        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-blue-600">How it works</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Automate your job search in 3 simple steps
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <CheckCircle className="h-5 w-5 flex-none text-blue-600" />
                    1. Paste job alerts
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Just copy and paste the long messages from your WhatsApp job groups directly into the app.</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <CheckCircle className="h-5 w-5 flex-none text-blue-600" />
                    2. AI matches your resume
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Our AI analyzes each job and compares it against your active resume, calculating a precise match percentage.</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <CheckCircle className="h-5 w-5 flex-none text-blue-600" />
                    3. Apply and track
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Automatically generate tailored emails and send them via Gmail. Track all your sent applications in one clean dashboard.</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
