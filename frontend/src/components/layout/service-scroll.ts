export function serviceScrollContainer() {
  const container = document.querySelector<HTMLElement>(".service-scroll");
  return container && ["auto", "hidden"].includes(getComputedStyle(container).overflowY)
    ? container
    : null;
}

export function serviceScrollTop() {
  return serviceScrollContainer()?.scrollTop ?? window.scrollY;
}

export function scrollServiceTo(top: number) {
  const container = serviceScrollContainer();
  if (container) container.scrollTo(0, top);
  else window.scrollTo(0, top);
}
