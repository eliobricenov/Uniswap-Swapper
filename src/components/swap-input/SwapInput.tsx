import React, { FC } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (change: string) => void;
};

const SwapInput: FC<Props> = ({ label, value, onChange }: Props) => (
  <label>
    <span>{label}</span>
    <br />
    <br />
    <input
      value={value}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      pattern="^[0-9]*[.,]?[0-9]*$"
      placeholder="0.0"
      minLength={1}
      name="hostAmount"
      onChange={v => onChange(v.target.value.replace(/,/g, '.'))}
    />
  </label>
);

export default SwapInput;
