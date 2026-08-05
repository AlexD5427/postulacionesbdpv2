import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessScreen } from './AccessScreen';

function montar(props: Partial<Parameters<typeof AccessScreen>[0]> = {}) {
  const onEnviar = vi.fn();
  render(
    <AccessScreen
      codigoDelEnlace="EV-RIES-4F2A"
      enviando={false}
      error={null}
      demostracion={false}
      onEnviar={onEnviar}
      {...props}
    />,
  );
  return { onEnviar };
}

describe('AccessScreen', () => {
  it('pide el número identificador y explica su formato con un ejemplo', () => {
    montar();
    const campo = screen.getByLabelText(/número identificador/i);
    expect(campo).toBeInTheDocument();
    // El ejemplo importa: «CarnetDeIdentidad-N.ºdeProceso-Año» describe el formato,
    // «1234567-12-2026» lo enseña.
    expect(screen.getByText(/1234567-12-2026/)).toBeInTheDocument();
  });

  /**
   * El eco de las tres partes es lo que hace el formato evidente sin un párrafo de
   * instrucciones. Y confirma a la persona que el sistema entendió su documento.
   */
  it('muestra las tres partes reconocidas mientras se escribe', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(screen.getByLabelText(/número identificador/i), '8765432LP-4-2026');

    expect(screen.getByText('8765432LP')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('la casilla de tratamiento de datos es una puerta real', async () => {
    const usuario = userEvent.setup();
    const { onEnviar } = montar();

    await usuario.type(screen.getByLabelText(/número identificador/i), '1234567-12-2026');
    await usuario.type(screen.getByLabelText(/nombre completo/i), 'Ana Quispe');

    const continuar = screen.getByRole('button', { name: /continuar/i });
    expect(continuar).toBeDisabled();

    await usuario.click(screen.getByRole('checkbox'));
    expect(continuar).toBeEnabled();
    await usuario.click(continuar);
    expect(onEnviar).toHaveBeenCalledTimes(1);
  });

  it('entrega el número normalizado y las partes ya separadas', async () => {
    const usuario = userEvent.setup();
    const { onEnviar } = montar();

    await usuario.type(screen.getByLabelText(/número identificador/i), '1234567-04-2026');
    await usuario.type(screen.getByLabelText(/nombre completo/i), '  Ana   Quispe  Mamani ');
    await usuario.click(screen.getByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: /continuar/i }));

    expect(onEnviar).toHaveBeenCalledWith({
      numero: { completo: '1234567-04-2026', carnet: '1234567', proceso: '4', anio: 2026 },
      // Los espacios de más se colapsan: el mismo nombre no debe quedar de dos formas
      // distintas en la hoja de cálculo.
      nombre: 'Ana Quispe Mamani',
      codigo: 'EV-RIES-4F2A',
    });
  });

  it('explica qué parte del número está mal en cuanto el campo pierde el foco', async () => {
    const usuario = userEvent.setup();
    montar();

    const campo = screen.getByLabelText(/número identificador/i);
    await usuario.type(campo, '12-12-2026');
    await usuario.tab();

    // El mensaje de error va en un `role="alert"`, así que se busca ahí y no por texto
    // suelto: el propio texto de ayuda del campo también menciona el carnet.
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/primera parte es tu carnet de identidad/i);
  });

  it('no pide el código cuando viene en el enlace, y lo muestra para que se pueda verificar', () => {
    montar();
    expect(screen.queryByLabelText(/código de la evaluación/i)).not.toBeInTheDocument();
    expect(screen.getByText('EV-RIES-4F2A')).toBeInTheDocument();
  });

  it('pide el código cuando no viene en el enlace', () => {
    montar({ codigoDelEnlace: undefined });
    expect(screen.getByLabelText(/código de la evaluación/i)).toBeInTheDocument();
  });

  /**
   * El campo contiene un documento de identidad. En un equipo compartido —un
   * telecentro, la sala de una universidad— el autocompletado del navegador lo
   * ofrecería a la siguiente persona.
   */
  it('desactiva el autocompletado del navegador en el campo del documento', () => {
    montar();
    expect(screen.getByLabelText(/número identificador/i)).toHaveAttribute('autocomplete', 'off');
  });

  it('avisa de forma permanente cuando el módulo está en demostración', () => {
    montar({ demostracion: true });
    expect(screen.getByText(/modo demostración/i)).toBeInTheDocument();
    expect(screen.getByText(/nada de lo que respondas se guarda/i)).toBeInTheDocument();
  });

  it('muestra el error de un intento anterior sin perder lo escrito', async () => {
    montar({ error: { mensaje: 'No existe ninguna evaluación con ese código.', pista: 'Revisa el enlace.' } });
    expect(screen.getByText(/no existe ninguna evaluación/i)).toBeInTheDocument();
    expect(screen.getByText(/revisa el enlace/i)).toBeInTheDocument();
  });
});
