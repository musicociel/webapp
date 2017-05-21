import { Directive, ElementRef, Output, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { Gesture } from 'ionic-angular/gestures/gesture';
declare var Hammer: any

@Directive({
  selector: '[appVerticalSwipe]'
})
export class VerticalSwipeDirective implements OnInit, OnDestroy {
  @Output() swipeup = new EventEmitter();
  @Output() swipedown = new EventEmitter();

  private el: HTMLElement
  private gesture: Gesture

  constructor(el: ElementRef) {
    this.el = el.nativeElement
  }

  ngOnInit() {
    this.gesture = new Gesture(this.el, {
      recognizers: [
        [Hammer.Swipe, {direction: Hammer.DIRECTION_VERTICAL}]
      ]
    });
    this.gesture.listen()
    this.gesture.on('swipeup', event => {
      this.swipeup.emit(event);
    });
    this.gesture.on('swipedown', event => {
      this.swipedown.emit(event);
    });
  }

  ngOnDestroy() {
    this.gesture.destroy();
  }
}
