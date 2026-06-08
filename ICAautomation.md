# Paste in ur ICA console

```js
function sendMessage(message) {
    const textarea = document.querySelector('#chat-input__text-area');
    const sendButton = document.querySelector(
        '[data-testid="send-prompt-container-send-button"]'
    );

    const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
    ).set;

    nativeSetter.call(textarea, message);

    textarea.dispatchEvent(
        new InputEvent('input', {
            bubbles: true,
            data: message,
            inputType: 'insertText'
        })
    );

    sendButton.click();
}

// ----------------------------------

setInterval(() => {
    sendMessage("explain me a topic in 10 lines related to SAP MM important of certification exam");
}, 5000);
```