import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessForm } from './AccessForm';

/**
 * The public entry form is the only place where a candidate types personal data,
 * so its guardrails are worth pinning: the button is a real gate, and the values
 * that leave the form are trimmed but never rewritten.
 */
describe('AccessForm', () => {
  it('keeps Continuar disabled until the code, the identity and the consent are valid', async () => {
    const user = userEvent.setup();
    render(<AccessForm onSubmit={vi.fn()} />);

    const submit = screen.getByRole('button', { name: /continuar/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/código de la evaluación/i), 'EVL-TEST-0001');
    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Pérez');
    await user.type(screen.getByLabelText(/^Carnet de Identidad/), '1234567 LP');
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it('explains why the document is requested before asking for it', () => {
    render(<AccessForm onSubmit={vi.fn()} />);
    expect(
      screen.getByText(/lo usamos únicamente para vincular tus respuestas con tu postulación/i),
    ).toBeInTheDocument();
  });

  it('rejects a name that contains the document number, with a helpful message', async () => {
    const user = userEvent.setup();
    render(<AccessForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana 1234567');
    await user.tab();

    expect(await screen.findByText(/el nombre no debe incluir números/i)).toBeInTheDocument();
  });

  it('rejects a document without enough digits', async () => {
    const user = userEvent.setup();
    render(<AccessForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/^Carnet de Identidad/), 'abc-');
    await user.tab();

    expect(await screen.findByText(/al menos cuatro números/i)).toBeInTheDocument();
  });

  it('uppercases the code and trims the identity, without altering the document itself', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AccessForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/código de la evaluación/i), ' evl-test-0001 ');
    await user.type(screen.getByLabelText(/nombre completo/i), '  Ana   Pérez  ');
    await user.type(screen.getByLabelText(/^Carnet de Identidad/), ' 1234567-1A ');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      publicCode: 'EVL-TEST-0001',
      fullName: 'Ana Pérez',
      // The hyphen and the letters survive exactly as typed.
      document: '1234567-1A',
    });
  });

  it('hides the code field when the code came from the link', () => {
    render(<AccessForm initialCode="EVL-TEST-0001" codeFromLink onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/código de la evaluación/i)).not.toBeInTheDocument();
  });
});
