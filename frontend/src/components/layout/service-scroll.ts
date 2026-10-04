export function serviceScrollContainer() {
  const container = document.querySelector<HTMLElement>(".service-scroll");
  return container && ["auto", "hidden"].includes(getComputedStyle(container).overflowY)
    ? container
    : null;
}

export function reviewScrollTop() {
  return serviceScrollContainer()?.scrollTop ?? window.scrollY;
}

export function scrollReviewTo(top: number) {
  const container = serviceScrollContainer();
  if (container) container.scrollTo(0, top);
  else window.scrollTo(0, top);
}
