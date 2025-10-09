class Popup {
    constructor(element) {
        this.htmlElement = element;

        this._escHideWindowHandler = (event) => {
            if (event.key === "Escape") {
                this.hide();
                document.removeEventListener(
                    "keydown",
                    this._escHideWindowHandler
                );
            }
        };
        this._removeWindowEventHandler = (event) => {
            this.htmlElement.classList.add("window-no-display");
        };
    }

    show() {
        console.log(this.htmlElement);
        this.htmlElement.removeEventListener(
            "transitionend",
            this._removeWindowEventHandler,
            { once: true }
        );

        this.htmlElement.classList.remove("window-no-display");
        setTimeout(() => {
            this.htmlElement.classList.add("window-active");
            document.addEventListener("keydown", this._escHideWindowHandler);
        });
    }

    hide() {
        document.removeEventListener("keydown", this._escHideWindowHandler);
        this.htmlElement.classList.remove("window-active");
        this.htmlElement.addEventListener(
            "transitionend",
            this._removeWindowEventHandler,
            { once: true }
        );
    }
}

export default Popup;
