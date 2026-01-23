'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarousel } from '@/components/ui/carousel';
import { useEffect } from 'react';

export type TestimonialItem = {
  name: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
  content: string;
};

const testimonials: TestimonialItem[] = [
  {
    name: 'Craig Bator',
    role: 'CEO & Co Founder',
    company: 'Zendesk',
    avatar:
      'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png?width=40&height=40&format=auto',
    rating: 5,
    content:
      "I've been using shadcn/studio for a year now and it's made managing my finances so much easier and quick.",
  },
  {
    name: 'Martin Dorwart',
    role: 'Product manager',
    company: 'Orbit',
    avatar:
      'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png?width=40&height=40&format=auto',
    rating: 4,
    content:
      "With shadcn/studio, I can easily track my investments and see how they're performing in real-time.",
  },
  {
    name: 'Sarah Johnson',
    role: 'Lead Designer',
    company: 'Figma',
    avatar:
      'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png?width=40&height=40&format=auto',
    rating: 5,
    content:
      "The UI components are beautifully designed and incredibly easy to customize. It's transformed our design workflow.",
  },
  {
    name: 'Alex Chen',
    role: 'Frontend Developer',
    company: 'Vercel',
    avatar:
      'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png?width=40&height=40&format=auto',
    rating: 4,
    content:
      'shadcn/studio has saved us countless hours in development. The component library is comprehensive and well-documented.',
  },
];

type TestimonialsComponentProps = {
  testimonials?: TestimonialItem[];
};

function CarouselNavButtons() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext, api } = useCarousel();
  // Auto-slide logic with looping
  useEffect(() => {
    const interval = setInterval(() => {
      if (api) {
        const selectedIndex = api.selectedScrollSnap();
        const slideCount = api.scrollSnapList().length;
        if (selectedIndex === slideCount - 1) {
          api.scrollTo(0);
        } else {
          scrollNext();
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [scrollNext, api]);

  return (
    <div className='flex justify-center mt-6'>
      <button
        aria-label='Previous testimonial'
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        className='bg-background border border-muted rounded-full h-8 w-8 min-w-0 p-0 flex items-center justify-center text-muted-foreground shadow-sm hover:bg-primary/10 hover:text-primary transition disabled:bg-primary/10 disabled:text-primary disabled:opacity-100 mr-2'
      >
        <ChevronLeft size={20} />
      </button>
      <button
        aria-label='Next testimonial'
        onClick={scrollNext}
        disabled={!canScrollNext}
        className='bg-background border border-muted rounded-full h-8 w-8 min-w-0 p-0 flex items-center justify-center text-muted-foreground shadow-sm hover:bg-primary/10 hover:text-primary transition disabled:bg-primary/10 disabled:text-primary disabled:opacity-100 ml-2'
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

function TestimonialsComponent({ testimonials: testimonialsProp }: TestimonialsComponentProps) {
  const items = testimonialsProp ?? testimonials;
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <Carousel
        className='mx-auto grid max-w-7xl grid-cols-1 items-center gap-11 px-4 sm:px-6 md:grid-cols-2 lg:px-8'
        opts={{
          align: 'start',
          slidesToScroll: 1,
        }}
      >
        {/* Left Content */}
        <div className='space-y-4 md:space-y-16'>
          <div className='space-y-4'>
            <Badge variant='outline' className='text-sm font-normal'>
              Testimonials
            </Badge>
            <h2 className='text-2xl font-semibold sm:text-3xl lg:text-4xl'>
              Trusted by leaders from various industries
            </h2>
            <p className='text-muted-foreground text-xl'>
              From career changes to dream jobs, here&apos;s how Shadcn Studio helped.
            </p>
            <CarouselNavButtons />
          </div>
        </div>

        {/* Right Testimonial Carousel */}
        <div className='relative'>
          <CarouselContent className='sm:-ml-6'>
            {items.map((testimonial, index) => (
              <CarouselItem key={index} className='sm:pl-6'>
                <div className='flex flex-col gap-10'>
                  <div className='space-y-2'>
                    <p className='h-14 text-8xl'>&ldquo;</p>
                    <p className='text-muted-foreground text-xl font-medium sm:text-2xl lg:text-3xl'>
                      {testimonial.content}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Avatar className='size-12 rounded-full'>
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className='rounded-full text-sm'>
                        {testimonial.name
                          .split(' ', 2)
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className='flex-1'>
                      <h4 className='text-lg font-medium'>{testimonial.name}</h4>
                      <p className='text-muted-foreground'>
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>
    </section>
  );
}

export default TestimonialsComponent;
