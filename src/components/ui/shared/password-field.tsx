// Password input with show/hide toggle. PrimeReact v11's InputPassword has
// no built-in toggle prop (unlike v10) — wraps the docs' IconField + mask-state pattern so it isn't repeated per field.
"use client";

import { useState } from "react";
import { Eye } from "@primeicons/react/eye";
import { EyeSlash } from "@primeicons/react/eye-slash";
import { IconField } from "@primereact/ui/iconfield";
import { InputPassword } from "@primereact/ui/inputpassword";
import type { InputPasswordMaskChangeEvent } from "@primereact/ui/inputpassword";

export function PasswordField({
  id,
  autoComplete,
  placeholder,
  invalid,
  value,
  onValueChange,
}: {
  id: string;
  autoComplete: string;
  placeholder?: string;
  invalid?: boolean;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [mask, setMask] = useState(true);

  return (
    <IconField.Root>
      <InputPassword
        id={id}
        autoComplete={autoComplete}
        placeholder={placeholder}
        invalid={invalid}
        mask={mask}
        onMaskChange={(e: InputPasswordMaskChangeEvent) => setMask(e.value)}
        value={value}
        onValueChange={(e: { value: string | null }) => onValueChange(e.value ?? "")}
      />
      <IconField.Inset>
        {mask ? <Eye onClick={() => setMask(false)} /> : <EyeSlash onClick={() => setMask(true)} />}
      </IconField.Inset>
    </IconField.Root>
  );
}
