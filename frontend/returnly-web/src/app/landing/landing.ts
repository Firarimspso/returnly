import { Component } from '@angular/core';
import { CtaComponent } from '../components/cta/cta';
import { FeaturesComponent } from '../components/features/features';
import { FooterComponent } from '../components/footer/footer';
import { HeroComponent } from '../components/hero/hero';
import { HowItWorksComponent } from '../components/how-it-works/how-it-works';
import { NavbarComponent } from '../components/navbar/navbar';
import { StatisticsComponent } from '../components/statistics/statistics';

@Component({
  selector: 'app-landing',
  imports: [NavbarComponent, HeroComponent, FeaturesComponent, HowItWorksComponent, StatisticsComponent, CtaComponent, FooterComponent],
  template: `<app-navbar /><main><app-hero /><app-features /><app-how-it-works /><app-statistics /><app-cta /></main><app-footer />`,
})
export class LandingComponent {}
