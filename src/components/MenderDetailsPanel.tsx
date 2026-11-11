import { useEffect, useId, useRef, useState } from 'react';
import { Globe2, Instagram, Linkedin, Mail, Phone, Route, SquareArrowOutUpRight, Twitter, X } from 'lucide-react';
import type { Vendor } from '../types';
import { trackMenderClick } from '../lib/menderAnalytics';
import { getTaxonomyLabel } from '../../shared/vendorTaxonomy.js';

const externalUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

function SocialIcon({ href }: { href: string | null }) {
  const host = href ? new URL(href).hostname.replace(/^www\./, '') : '';
  const Icon = host === 'instagram.com' || host.endsWith('.instagram.com') ? Instagram
    : host === 'twitter.com' || host.endsWith('.twitter.com') ? Twitter
    : host === 'x.com' || host.endsWith('.x.com') ? X
    : host === 'linkedin.com' || host.endsWith('.linkedin.com') ? Linkedin
    : SquareArrowOutUpRight;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

interface MenderDetailsPanelProps {
  vendor: Vendor;
  onClose: () => void;
}

export function MenderDetailsPanel({ vendor, onClose }: MenderDetailsPanelProps) {
  const titleId = useId();
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState<'about' | 'reviews'>('about');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const name = vendor.name.trim() || 'Unnamed mender';
  const primaryType = vendor.types?.[0];
  const approximate = vendor.location_visibility === 'approx';
  const website = externalUrl(vendor.website || vendor.online_presence);
  const social = externalUrl(vendor.social);
  const phone = vendor.phone?.trim();
  const email = vendor.email?.trim();
  const review = vendor.review_text?.trim();
  const rating = typeof vendor.rating === 'number' && Number.isFinite(vendor.rating) && vendor.rating > 0 && vendor.rating <= 5 ? vendor.rating : null;
  const ratingCount = typeof vendor.rating_count === 'number' && Number.isInteger(vendor.rating_count) && vendor.rating_count > 0 ? vendor.rating_count : null;
  const hasCoordinates = Number.isFinite(vendor.latitude) && Number.isFinite(vendor.longitude);
  const destination = hasCoordinates
    ? `${vendor.latitude},${vendor.longitude}`
    : [name, vendor.address].filter(Boolean).join(' ');
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const groups = [
    { key: 'categories', label: 'Categories', values: vendor.categories },
    { key: 'regional_techniques', label: 'Regional techniques', values: vendor.regional_techniques },
  ] as const;
  const socialHost = social ? new URL(social).hostname.replace(/^www\./, '') : '';
  const socialLabel = socialHost === 'instagram.com' || socialHost.endsWith('.instagram.com') ? 'Instagram'
    : socialHost === 'twitter.com' || socialHost.endsWith('.twitter.com') ? 'Twitter'
    : socialHost === 'x.com' || socialHost.endsWith('.x.com') ? 'X'
    : socialHost === 'linkedin.com' || socialHost.endsWith('.linkedin.com') ? 'LinkedIn'
    : 'Social';
  const actions = [
    { label: 'Call', destination: phone, href: phone ? `tel:${phone}` : null, action: 'phone_click' as const, icon: <Phone className="h-4 w-4" aria-hidden="true" />, external: false },
    { label: 'Email', destination: email, href: email ? `mailto:${email}` : null, action: 'email_click' as const, icon: <Mail className="h-4 w-4" aria-hidden="true" />, external: false },
    { label: 'Website', destination: website, href: website, action: 'website_click' as const, icon: <Globe2 className="h-4 w-4" aria-hidden="true" />, external: true },
    { label: socialLabel, destination: social, href: social, action: 'social_click' as const, icon: <SocialIcon href={social} />, external: true },
  ];

  const renderContactActions = (placement: 'desktop' | 'mobile') => (
    <nav className={`mymenders-details__contact-actions mymenders-details__contact-actions--${placement}`} aria-label="Contact this mender">
      {actions.map(({ label, destination, href, action, icon, external }) => href ? (
        <a key={label} href={href} aria-label={`${label}: ${destination}`} title={`${label}: ${destination}`} className="mymenders-details__contact-action" target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} onClick={() => trackMenderClick(vendor.id, action)}>
          {icon}
        </a>
      ) : (
        <button key={label} type="button" disabled aria-label={`${label}: No ${label.toLowerCase()} available`} title={`No ${label.toLowerCase()} available`} className="mymenders-details__contact-action">
          {icon}
        </button>
      ))}
    </nav>
  );

  const renderDirectionsRow = (placement: 'desktop' | 'mobile') => (
    <footer className={`mymenders-details__actions mymenders-details__actions--${placement}`}>
      {approximate ? (
        <button type="button" disabled title="Directions unavailable for approximate locations" className="mymenders-details__directions">
          <Route className="h-4 w-4" aria-hidden="true" /> Directions
        </button>
      ) : (
        <a href={directions} target="_blank" rel="noopener noreferrer" className="mymenders-details__directions">
          <Route className="h-4 w-4" aria-hidden="true" /> Directions
        </a>
      )}
    </footer>
  );

  useEffect(() => {
    setActiveTab('about');
    scrollRef.current?.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [vendor.id]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <section className="mymenders-details" aria-labelledby={titleId}>
      <header className="mymenders-details__header">
        <div className="mymenders-details__heading">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="mymenders-card-title-semi text-[var(--mm-text)] capitalize">{name}</h2>
          {primaryType && <p className="mymenders-map-card-label text-[var(--mm-muted)]">{getTaxonomyLabel('types', primaryType)}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close mender details" className="mymenders-details__close">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="mymenders-details__tabs" role="tablist" aria-label="Mender information" onKeyDown={(event) => {
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
          : event.key === 'ArrowRight' ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : null;
        if (next === null) return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      }}>
        {(['about', 'reviews'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" id={`${tabsId}-${tab}-tab`} aria-controls={`${tabsId}-${tab}-panel`} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} onClick={() => {
            setActiveTab(tab);
            scrollRef.current?.scrollTo(0, 0);
          }}>
            {tab === 'about' ? 'About' : 'Reviews'}
          </button>
        ))}
      </div>
      <div ref={scrollRef} className="mymenders-details__scroll">
        <div className="mymenders-details__body" role="tabpanel" id={`${tabsId}-about-panel`} aria-labelledby={`${tabsId}-about-tab`} tabIndex={0} hidden={activeTab !== 'about'}>
          <div className="mymenders-details__contacts">
            {(approximate || vendor.address?.trim()) && (
              <section className="mymenders-details__section">
                <h3 className="mymenders-map-card-label text-[var(--mm-muted)]">Address</h3>
                <p>{approximate ? 'Approximate location. Contact the mender for the exact location.' : vendor.address}</p>
              </section>
            )}
            {renderContactActions('desktop')}
            {renderContactActions('mobile')}
            {vendor.contact?.trim() && <p className="mymenders-details__contact-info">{vendor.contact}</p>}
          </div>
          {groups.some(({ values }) => values?.length) && (
            <div className="mymenders-details__taxonomy">
              {groups.map(({ key, label, values }) => values?.length ? (
                <section key={key} className="mymenders-details__section">
                  <h3 className="mymenders-map-card-label text-[var(--mm-muted)]">{label}</h3>
                  <ul className={`mymenders-details__list mymenders-details__list--${key}`}>
                    {values.map((value) => (
                      <li key={value}>
                        {getTaxonomyLabel(key, value)}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null)}
            </div>
          )}
          {vendor.hours?.trim() && (
            <section className="mymenders-details__section">
              <h3 className="mymenders-map-card-label text-[var(--mm-muted)]">Opening hours</h3>
              <p className="whitespace-pre-wrap">{vendor.hours}</p>
            </section>
          )}
        </div>
        <div className="mymenders-details__body" role="tabpanel" id={`${tabsId}-reviews-panel`} aria-labelledby={`${tabsId}-reviews-tab`} tabIndex={0} hidden={activeTab !== 'reviews'}>
          {rating !== null && <p className="mymenders-details__rating">{rating} out of 5{ratingCount !== null && <span> · {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</span>}</p>}
          <p className="mymenders-details__review">{review || (rating !== null ? 'No written reviews yet.' : 'No reviews yet.')}</p>
        </div>
        {renderDirectionsRow('mobile')}
      </div>
      {renderDirectionsRow('desktop')}
    </section>
  );
}
