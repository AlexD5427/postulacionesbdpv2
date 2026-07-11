import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssessmentConsentScreen } from './AssessmentConsentScreen';
import type { AssessmentDefinition } from '@/shared/types/domain';

const definition: AssessmentDefinition = {
  meta: { id: 'a1', externalReference: 'ASSESS-1', sourceProvider: 'mock', authoritative: true },
  title: 'Evaluación demostrativa',
  version: '1.0.0',
  instructions: 'Instrucciones de prueba.',
  disclaimer: 'Evaluación demostrativa para el MVP.',
  estimatedMinutes: 20,
  attemptPolicy: { maxAttempts: 1, allowResume: true },
  timing: { mode: 'untimed' },
  sections: [],
  consentVersion: '2026-01',
  monitoringPolicyVersion: '2026-01',
  accessibility: { keyboardInstructions: 'Usa Tab.', accommodationsContact: 'a@bdp.com.bo' },
  submissionPolicy: { requireAllRequired: true },
};

describe('AssessmentConsentScreen', () => {
  it('discloses the technical monitoring and keeps camera/mic disabled', () => {
    render(<AssessmentConsentScreen definition={definition} onStart={() => {}} starting={false} />);
    expect(screen.getByText(/información técnica limitada/i)).toBeInTheDocument();
    expect(screen.getByText(/no activa tu cámara ni tu micrófono/i)).toBeInTheDocument();
  });

  it('keeps the start button disabled until BOTH consent boxes are checked', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<AssessmentConsentScreen definition={definition} onStart={onStart} starting={false} />);

    const startButton = screen.getByRole('button', { name: /Comenzar evaluación/i });
    expect(startButton).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);
    expect(startButton).toBeDisabled();
    await user.click(checkboxes[1]!);
    expect(startButton).toBeEnabled();

    await user.click(startButton);
    expect(onStart).toHaveBeenCalledOnce();
  });
});
