# Web-Chip8

A web-based emulator for the classic Chip-8 virtual machine.

### Features and TODO List

-   [x] Support for the [Chip8Archive](https://johnearnest.github.io/chip8Archive/) ROM library.

-   [x] Touchscreen support for input using the virtual keyboard.

-   [x] Custom ROM loading.

-   [x] Service worker for offline support and PWA.

-   [x] Realtime visualization of the the internal state of the emulator including the memory, registers, timers, pointers, and stack.

-   [x] Pausing, resuming, step-by-step execution.

-   [x] Chip8 emulator quirks.

## Getting Started

### Cloning the repository

Since the ROM library is included as a Git Submodule, you must clone the repository recursively.

```bash
git clone --recursive https://github.com/ManpreetXSingh/Web-Chip8.git
```

Alternatively, if you cloned without --recursive:

```bash
git submodule update --init --recursive
```

### Running a Development Web Server

```bash
npm start
```

## Tech Stack

-   **HTML**, **CSS** - For the layout and styling.
-   **JavaScript** - For the core emulation logic, input handling, and dynamic rendering.
-   **Express** - For the web server.
