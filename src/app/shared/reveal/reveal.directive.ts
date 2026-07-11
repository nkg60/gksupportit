import { AfterViewInit, Directive, ElementRef, inject, Input, OnDestroy } from '@angular/core';

/**
 * Directive « révélation au défilement » : l'élément apparaît en fondu +
 * glissement quand il entre dans le viewport (IntersectionObserver).
 * Respecte « prefers-reduced-motion » (affichage immédiat sans animation).
 *
 * Usage : <div gkReveal>…</div>  ou  <div gkReveal="1">…</div> (délai en cran).
 */
@Directive({
  selector: '[gkReveal]',
  standalone: true,
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Cran de délai (0, 1, 2, 3…) pour un effet en cascade. */
  @Input('gkReveal') delai: string | number = 0;

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('gk-reveal');
    const cran = Number(this.delai) || 0;
    if (cran > 0) node.style.setProperty('--gk-reveal-delay', `${cran * 90}ms`);

    const sansAnimation =
      typeof IntersectionObserver === 'undefined' ||
      (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

    if (sansAnimation) {
      node.classList.add('gk-reveal--visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('gk-reveal--visible');
            this.observer?.unobserve(node);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
