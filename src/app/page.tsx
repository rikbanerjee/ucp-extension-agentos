import { Hero } from '@/components/home/Hero';
import { AudienceCards } from '@/components/home/AudienceCards';
import { TransactionShowcase } from '@/components/home/TransactionShowcase';
import { RetailBreadth } from '@/components/home/RetailBreadth';
import { HowItWorks } from '@/components/home/HowItWorks';
import { MaturityEvidence } from '@/components/home/MaturityEvidence';
import { DeveloperGateway } from '@/components/home/DeveloperGateway';
import { FinalCta } from '@/components/home/FinalCta';

export default function Home() {
  return (
    <div className="relative scroll-smooth">
      <Hero />
      <AudienceCards />
      <TransactionShowcase />
      <RetailBreadth />
      <HowItWorks />
      <MaturityEvidence />
      <DeveloperGateway />
      <FinalCta />
    </div>
  );
}
