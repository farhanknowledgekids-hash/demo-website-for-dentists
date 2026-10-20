import { BookingProvider } from './booking/BookingContext';
import { BookingDrawer } from './booking/BookingDrawer';
import { DemoBanner, Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Treatments } from './components/Treatments';
import { Approach, Experience, Faq, Journey, Team, Testimonials } from './components/Sections';
import { Contact, FinalCta, Footer, MobileBookBar } from './components/Closing';

export function App() {
  return (
    <BookingProvider>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div id="page">
        <DemoBanner />
        <Nav />
        <main id="main">
          <Hero />
          <Approach />
          <Treatments />
          <Journey />
          <Team />
          <Experience />
          <Testimonials />
          <Faq />
          <Contact />
          <FinalCta />
        </main>
        <Footer />
        <MobileBookBar />
      </div>
      <BookingDrawer />
    </BookingProvider>
  );
}
