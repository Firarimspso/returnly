import { Component } from '@angular/core';

interface Feature {
  title: string;
  description: string;
  icon: string;
  tone: string;
}

@Component({
  selector: 'app-features',
  templateUrl: './features.html',
  styleUrl: './features.scss',
})
export class FeaturesComponent {
  protected readonly features: Feature[] = [
    { title: 'QR Rewards', description: 'Turn every visit into an opportunity with frictionless, app-free QR experiences.', icon: '⌗', tone: 'violet' },
    { title: 'Loyalty Points', description: 'Create flexible point programs that keep your customers coming back for more.', icon: '✦', tone: 'amber' },
    { title: 'Scratch Cards', description: 'Surprise and delight guests with interactive rewards after every purchase.', icon: '◇', tone: 'rose' },
    { title: 'Customer Analytics', description: 'Understand visit patterns, spending habits, and what drives true loyalty.', icon: '⌁', tone: 'blue' },
    { title: 'Promotions', description: 'Send perfectly timed offers that bring customers back on your quietest days.', icon: '↗', tone: 'green' },
    { title: 'Multi-location Support', description: 'Manage every location, campaign, and customer from one simple workspace.', icon: '⌂', tone: 'purple' },
  ];
}
