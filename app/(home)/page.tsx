import HeroWrapper from './HeroWrapper';
import HomeMenu from './HomeMenu';
import FeaturesSection from './FeaturesSection';
import Testimonials from './Testimonials';
import RestaurantLocationsSection from './RestaurantLocationsSection';
import CallToAction from './CallToAction';

const HomePage = () => {
  return (
    <div className='flex flex-col gap-16'>
      <HeroWrapper />
      <HomeMenu />
      <FeaturesSection />
      <Testimonials />
      <RestaurantLocationsSection />
      <CallToAction />
    </div>
  );
};

export default HomePage;
