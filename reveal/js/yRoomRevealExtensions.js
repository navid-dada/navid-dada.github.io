/*
 * ysura GmbH ("COMPANY") CONFIDENTIAL
 * Unpublished Copyright (c) 2012-2015 ysura GmbH, All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains the property of COMPANY. The intellectual and technical concepts contained
 * herein are proprietary to COMPANY and may be covered by U.S. and Foreign Patents, patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained
 * from COMPANY.  Access to the source code contained herein is hereby forbidden to anyone except current COMPANY employees, managers or contractors who have executed
 * Confidentiality and Non-disclosure agreements explicitly covering such access.
 *
 * The copyright notice above does not evidence any actual or intended publication or disclosure  of  this source code, which includes
 * information that is confidential and/or proprietary, and is a trade secret, of COMPANY. ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC PERFORMANCE,
 * OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS SOURCE CODE WITHOUT THE EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION OF APPLICABLE
 * LAWS AND INTERNATIONAL TREATIES. THE RECEIPT OR POSSESSION OF THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY RIGHTS
 * TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE, USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 */

/**
 * Dispatches a interaction event to yRoom. A interaction event is e.g. a click on an interactive
 * element in the media.
 *
 * Currently following events are supported:
 * - click
 *
 * @param jqEvent the JS event interaction event as given in the event handler
 * @param selector the jQuery selector of the element interacted with
 */
function dispatchInteractionEvent(jqEvent, selector) {
    if (window.parent !== window.self) {
        const payload = JSON.stringify({
            namespace: "reveal",
            eventName: "interaction",
            interaction: {
                type: jqEvent.type,
                selector: selector
            }
        });
        window.parent.postMessage(payload, '*');
    }
}

// Enable communication with yRoom
window.addEventListener("message", function(event) {
    const dispatchPointerCalculated = (data) => {
        if (window.parent !== window.self) {
            const payload = JSON.stringify({
                namespace: "reveal",
                eventName: "pointerCalculated",
                pointerCalculation: data
            });
            window.parent.postMessage(payload, '*');
        }
    };

    const data = event.data;
    const isHandledEvent = data && data.namespace === "reveal";
    if (isHandledEvent) {
        if (data.eventName === "slidechanged" && data.state) {
            Reveal.setState(event.data.state);
        } else if (data.eventName === "interaction" && data.interaction) {
            const type = event.data.interaction.type;
            const selector = event.data.interaction.selector;
            if (type === "click") {
                $(selector).click();
                return;
            }
        } else if (data.eventName === "pointer" && data.pointer) {
            const container = $(".slides").get(0);
            const boundingRect = container.getBoundingClientRect();
            const zoom = container.style.zoom || 1;
            dispatchPointerCalculated({
                id: data.pointer.id,
                posX: boundingRect.left + zoom * data.pointer.rx * boundingRect.width,
                posY: boundingRect.top + zoom * data.pointer.ry * boundingRect.height,
                rx: data.pointer.rx,
                ry: data.pointer.ry,
                isOrganizer: data.pointer.isOrganizer,
                source: "iframe"
            });
        }
    }
});

let timeoutHandle = null;

// Dispatch a pointer request to yRoom after 500ms after a mouse down event.
$(".slides").first().on("mousedown", function(event) {
    const dispatchPointerRequested = (data) => {
        if (window.parent !== window.self) {
            const payload = JSON.stringify({
                namespace: "reveal",
                eventName: "pointerRequested",
                pointerRequest: data
            });
            window.parent.postMessage(payload, '*');
        }
    };

    const boundingRect = event.currentTarget.getBoundingClientRect();
    const zoom = event.currentTarget.style.zoom || 1;
    const mx = event.pageX - boundingRect.left;
    const my = event.pageY - boundingRect.top;
    const data = {
        posX: event.clientX,
        posY: event.clientY,
        rx: mx / boundingRect.width / zoom,
        ry: my / boundingRect.height / zoom
    };
    timeoutHandle = setTimeout(() => {
        dispatchPointerRequested(data)
    }, 500);
});

// Cancel any pending pointer requests in case the mouse button was released before the required 500ms.
$(".slides").first().on("mouseup", function() {
    if (timeoutHandle) {
        clearTimeout(timeoutHandle);
    }
});
