import { useEffect, useState, useRef } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';

export type PizzaData = {
  _id: string;
  name: string;
  image: string;
  description: string;
};

type HeroSectionProps = {
  pizzas: PizzaData[];
};

const HeroSection = ({ pizzas }: HeroSectionProps) => {
  const [mainApi, setMainApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!mainApi) return;
    mainApi.on('select', () => {});
  }, [mainApi]);

  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));

  return (
    <section className='flex-1 py-12 sm:py-16 lg:py-24'>
      <div className='mx-auto flex h-full max-w-7xl flex-col gap-16 px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-6 gap-y-12 md:gap-y-16 lg:grid-cols-5'>
          <div className='flex w-full flex-col justify-center gap-5 max-lg:items-center lg:col-span-3 lg:h-95.5'>
            <h1 className='text-3xl leading-[1.29167] font-semibold text-balance max-lg:text-center sm:text-4xl lg:text-5xl'>
              Savor the taste of perfection
            </h1>
            <p className='text-muted-foreground max-w-xl text-xl max-lg:text-center'>
              Welcome to Restaurant where passion meets the plate. From sizzling appetisers to
              signature desserts, every dish is crafted to delight your senses.
            </p>
            <div className='flex items-center gap-4'>
              <Button
                asChild
                size='lg'
                className='group relative w-fit overflow-hidden rounded-full text-base bg-primary text-primary-foreground before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] before:bg-size-[250%_250%,100%_100%] before:bg-position-[200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-position-[-100%_0,0_0] has-[>svg]:px-6 dark:before:bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_50%,transparent_75%,transparent_100%)]'
              >
                <a href='#'>
                  Order now
                  <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5' />
                </a>
              </Button>
            </div>
          </div>
          <Carousel
            className='w-full lg:col-span-2'
            setApi={setMainApi}
            plugins={[plugin.current]}
            opts={{ loop: true }}
          >
            <CarouselContent>
              {pizzas.map((pizza) => (
                <CarouselItem key={pizza._id} className='flex w-full items-center justify-center'>
                  <Image
                    src={pizza.image}
                    alt={pizza.name}
                    width={300}
                    height={300}
                    className='size-95 object-contain rounded-xl shadow-lg'
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
