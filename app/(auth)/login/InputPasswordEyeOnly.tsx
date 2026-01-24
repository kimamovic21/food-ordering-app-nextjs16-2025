import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function InputPasswordEyeOnly({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const id = useId();

  return (
    <div className='relative w-full'>
      <Input
        id={id}
        type={isVisible ? 'text' : 'password'}
        placeholder='Password'
        value={value}
        onChange={onChange}
        className='pr-9 w-full rounded-md'
      />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={() => setIsVisible((v) => !v)}
        className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
        tabIndex={-1}
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
      </Button>
    </div>
  );
}
