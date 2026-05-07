# PROVISIONAL PATENT APPLICATION SPECIFICATION

**Title:** Integrated Safety Communication System for Augmentative and Alternative Communication Devices with Device-Agnostic Eye-Tracking and Sequential Input Logic

---

## FIELD OF THE INVENTION

The present invention relates to augmentative and alternative communication (AAC) systems, and more particularly to software-implemented safety alert systems embedded within AAC applications that enable nonverbal or minimally verbal individuals to communicate distress, physical harm, or the need for immediate assistance through a structured sequential input protocol operable across multiple device types and input modalities, including touch, switch access, and eye-tracking hardware and software.

---

## BACKGROUND OF THE INVENTION

Augmentative and alternative communication (AAC) devices and applications serve individuals who are nonverbal or minimally verbal due to conditions including but not limited to autism spectrum disorder (ASD), cerebral palsy, aphasia, amyotrophic lateral sclerosis (ALS), traumatic brain injury, Angelman syndrome, Rett syndrome, and other neurological or developmental conditions affecting speech production.

Existing AAC systems are primarily designed to facilitate expressive communication — enabling users to construct phrases, request objects, or convey preferences. However, a critical gap exists in safety communication: the ability of a nonverbal individual to rapidly and reliably alert a caregiver, parent, or emergency contact when the individual is experiencing physical harm, abuse, fear, or a medical emergency.

Current AAC systems suffer from several deficiencies with respect to safety communication:

1. **No dedicated safety pathway:** Existing AAC devices treat distress-related symbols (e.g., "help," "hurt," "scared") the same as any other communication symbol, with no mechanism to escalate such inputs to an external caregiver alert.

2. **False positive risk:** A single-tap alert system would generate excessive false positives for nonverbal individuals who may accidentally activate symbols. No existing system implements a sequential confirmation protocol specifically designed to distinguish intentional distress communication from accidental activation.

3. **Hardware dependency:** Existing advanced AAC features, including eye-tracking-based input, are typically locked to proprietary hardware (e.g., Tobii Dynavox, EyeLink systems) at costs ranging from $5,000 to $15,000+, creating significant access barriers for underserved populations.

4. **No device-agnostic implementation:** No existing AAC safety system implements eye-tracking-compatible input logic using software-only methods that function across commodity hardware including smartphones, tablets, and standard computers.

5. **Security gaps:** Existing AAC applications frequently lack caregiver-controlled PIN protection over application settings, creating vulnerability to unauthorized modification of alert recipient information.

There exists a significant need for an AAC system with an integrated safety communication layer that: (a) detects distress-related symbol activations; (b) presents a sequential confirmation step to reduce false positives; (c) fires a multi-pathway alert to a designated caregiver or emergency contact upon confirmed activation; (d) operates across any touch, switch, or eye-tracking input modality without proprietary hardware; and (e) secures caregiver configuration behind a PIN-gated interface.

The present invention addresses all of these needs.

---

## SUMMARY OF THE INVENTION

The present invention provides a software-implemented safety communication system integrated within an augmentative and alternative communication (AAC) application. The system monitors user symbol activations in real time, identifies activations of a predefined set of safety-related symbol identifiers, presents a sequential confirmation interface with an auto-dismissing timer, and upon confirmation, dispatches an emergency alert to a designated caregiver contact via a primary electronic alert service with an automatic fallback to a secondary alert pathway.

The invention further provides a device-agnostic input architecture that accepts safety symbol activations via touch input, sequential button presses (operable with switch access devices), and gaze-dwell input patterns compatible with eye-tracking hardware and software, without requiring proprietary eye-tracking hardware and without requiring modification of the alert dispatch logic between input modalities.

In one aspect, the invention provides a method comprising: monitoring a symbol grid interface for activation of one or more safety-triggering symbol identifiers; upon detection of such activation, presenting a confirmation prompt with a countdown auto-dismiss timer; upon affirmative user response within the timer window, dispatching an alert message containing the user's identifier and the specific symbol or symbols activated to a designated caregiver communication endpoint; and upon expiration of the timer without user response, dismissing the confirmation prompt without dispatching an alert.

In another aspect, the invention provides an AAC system comprising: a symbol grid interface configured to display a plurality of communication symbols; a safety detection module configured to monitor activations and identify activations corresponding to safety-triggering symbols; a sequential confirmation module configured to present a two-step confirmation interface upon safety symbol detection; an alert dispatch module configured to transmit an alert via a primary service endpoint and, upon failure of the primary endpoint, automatically retry via a secondary fallback endpoint; and a PIN-gated configuration interface through which a caregiver designates the alert recipient contact information and system settings.

---

## BRIEF DESCRIPTION OF THE DRAWINGS

**FIG. 1** is a schematic diagram illustrating the safety communication system architecture, showing the symbol grid, safety detection module, sequential confirmation interface, and dual-pathway alert dispatch system.

---

## DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENTS

The following detailed description sets forth specific embodiments of the invention. It will be understood that the description is illustrative and not limiting, and that equivalent elements and methods are within the scope of the invention.

### 1. System Overview

The invention is implemented as a software application operable on any computing device capable of running a web browser or native application environment, including but not limited to smartphones, tablets, laptop computers, desktop computers, and dedicated AAC communication devices. In the preferred embodiment, the application is implemented using web technologies including HTML5, CSS3, and JavaScript, and is operable without installation via a web browser on any operating system.

The system comprises five primary functional modules:
- A **Symbol Grid Interface** providing the user-facing AAC communication grid
- A **Safety Detection Module** monitoring symbol activations against a defined set of safety-triggering identifiers
- A **Sequential Confirmation Module** presenting a two-step confirmation interface upon safety symbol detection
- An **Alert Dispatch Module** transmitting caregiver alerts via primary and fallback pathways
- A **PIN-Gated Configuration Interface** through which caregivers securely configure alert settings

### 2. Symbol Grid Interface

The symbol grid interface presents a plurality of communication symbols organized by semantic category. Each symbol is associated with a unique symbol identifier. In the preferred embodiment, symbols are sourced from an open-licensed symbol library (such as the Mulberry Symbol Set, licensed under Creative Commons CC BY-SA 4.0) and rendered as image elements within a responsive grid layout.

Users activate symbols by touch (on touchscreen devices), mouse click (on pointer devices), switch access (via keyboard or external switch hardware), or gaze dwell (via eye-tracking hardware or software). The system treats all of these input modalities equivalently at the symbol activation event level, enabling the safety detection logic to operate uniformly regardless of input method.

### 3. Safety-Triggering Symbol Identifiers

The Safety Detection Module maintains a predefined set of safety-triggering symbol identifiers. In the preferred embodiment, these identifiers include: `cv_help`, `help`, `hurt`, `hurt2`, `scared`, and `q_hurt`, corresponding to symbols communicating requests for help, reports of physical pain or injury, and expressions of fear. The set of safety-triggering identifiers is configurable by a caregiver through the PIN-gated configuration interface.

Upon any symbol activation event, the Safety Detection Module compares the activated symbol's identifier against the set of safety-triggering identifiers. If a match is detected, the module immediately invokes the Sequential Confirmation Module.

### 4. Sequential Confirmation Module

The Sequential Confirmation Module presents a confirmation interface designed to reduce false positive alerts while remaining operable by users with limited motor control or communication ability. The confirmation interface presents a binary prompt — in the preferred embodiment, the text "Do you need help right now?" — along with two response options: an affirmative option (e.g., "Yes, I need help") and a negative option (e.g., "No, I'm okay").

The confirmation interface is accompanied by an auto-dismiss countdown timer. In the preferred embodiment, the countdown duration is ten (10) seconds. If no user input is received within the countdown window, the confirmation interface is automatically dismissed without dispatching any alert. This design allows a user who accidentally activated a safety symbol to simply wait for the interface to dismiss, without requiring the user to actively cancel.

If the user selects the affirmative response option within the countdown window, the Sequential Confirmation Module invokes the Alert Dispatch Module.

### 5. Alert Dispatch Module

Upon invocation by the Sequential Confirmation Module, the Alert Dispatch Module assembles an alert message comprising: the name or identifier of the AAC user (as configured in the caregiver settings); the specific safety symbol or symbols that were activated; and a timestamp of the alert event. The alert message is transmitted to the caregiver's designated communication endpoint.

The Alert Dispatch Module implements a dual-pathway architecture to maximize reliability of alert delivery:

**Primary Pathway:** The module first attempts to transmit the alert via an electronic messaging service API (in the preferred embodiment, an email delivery API such as EmailJS or a functionally equivalent service). The alert is formatted as an electronic mail message addressed to the caregiver's email address as configured in the caregiver settings.

**Fallback Pathway:** If the primary pathway fails — due to network unavailability, API service interruption, or any other failure condition — the module automatically initiates a fallback alert via the device's native email client using a `mailto:` URI scheme. The `mailto:` fallback pre-populates the recipient address, subject line, and message body with the same alert content as the primary pathway, enabling the caregiver to transmit the alert with a single confirmation action in the device's email client.

In an alternative embodiment, the Alert Dispatch Module additionally queues failed alert transmissions in browser-based persistent storage and retransmits queued alerts when network connectivity is restored, using the Background Sync API or equivalent asynchronous retry mechanism.

### 6. Device-Agnostic Eye-Tracking Compatibility

A key feature of the invention is its compatibility with eye-tracking input modalities without requiring proprietary eye-tracking hardware. This is achieved through a sequential input architecture in which all symbol activations — whether generated by touch, switch, or gaze-dwell input — are processed as equivalent events by the Safety Detection Module.

Eye-tracking software and hardware (including webcam-based gaze estimation systems such as WebGazer.js, and dedicated eye-tracking devices such as those manufactured by Tobii, Eyegaze, or equivalent) generate symbol activation events by detecting sustained gaze fixation on a symbol for a configured dwell period. The present invention does not require modification of the safety detection, confirmation, or alert dispatch logic to support such inputs, because the system is architected to respond to symbol activation events regardless of their origin.

This architecture enables the safety communication system to function with any eye-tracking device or software capable of generating a symbol activation event, including commodity webcam-based systems that do not require specialized hardware purchases. This device-agnostic design significantly reduces the cost barrier for access to AAC safety communication features.

In an alternative embodiment, the system implements a software-based gaze estimation module using a device camera and a machine learning model (such as a convolutional neural network trained on gaze direction data), enabling eye-tracking-based AAC input on any device with a forward-facing camera without requiring any external hardware.

### 7. PIN-Gated Configuration Interface

The caregiver configuration interface enables a parent, therapist, or other designated caregiver to configure: the alert recipient's email address or other communication endpoint; the AAC user's name as it will appear in alert messages; and other application settings including symbol grid customization and voice output preferences.

Access to the caregiver configuration interface is protected by a Personal Identification Number (PIN) established by the caregiver during initial application setup. The PIN is established during an onboarding sequence that requires PIN creation prior to the completion of setup. This design prevents an unauthorized user — including the AAC user themselves, who may activate symbols during normal communication use — from modifying alert recipient information or other caregiver settings.

In the preferred embodiment, the PIN is stored in encrypted form in browser-based local storage or an equivalent persistent client-side storage mechanism. In an alternative embodiment, the PIN is stored in a server-side database associated with a caregiver account, enabling PIN recovery and multi-device synchronization.

The onboarding sequence enforces PIN creation before allowing access to the main application interface, closing the security vulnerability present in prior art systems that default to a known or empty PIN value.

### 8. AI-Assisted Communication Module

In one embodiment, the system incorporates an artificial intelligence language model to assist the AAC user in generating natural language communication from symbol selections. When a user selects a sequence of symbols (e.g., "want," "eat," "pizza"), the AI-Assisted Communication Module transmits the selected symbol sequence to a large language model (LLM) API and receives a grammatically complete natural language sentence (e.g., "I want to eat pizza") suitable for text-to-speech output or display.

This module operates in a request-response architecture in which: (a) the user assembles a symbol sequence in the communication interface; (b) the assembled sequence is transmitted to the LLM service endpoint with contextual parameters; (c) the LLM returns one or more natural language sentence completions; and (d) the system presents the completions to the user for selection or immediate output via a text-to-speech engine.

In an alternative embodiment, the AI-Assisted Communication Module operates offline using a locally-cached compressed language model, eliminating dependence on network connectivity for sentence generation.

The AI-Assisted Communication Module is independent of the Safety Detection Module; safety symbol activations are processed by the Safety Detection Module prior to any AI sentence generation, ensuring that safety alerts are never delayed by AI processing.

### 9. Multi-Contact and Multi-Pathway Alert Architecture

In one embodiment, the Alert Dispatch Module supports designation of multiple caregiver contacts, each receiving the safety alert independently and simultaneously. The caregiver configuration interface enables a primary contact (e.g., a parent) and one or more secondary contacts (e.g., a teacher, therapist, or second parent) to be designated, with each contact receiving the full alert content via their configured communication pathway.

In one embodiment, the Alert Dispatch Module supports alert delivery via Short Message Service (SMS) using a telecommunications API (e.g., Twilio or equivalent), enabling alert delivery to caregiver mobile phone numbers in addition to or as an alternative to email delivery.

In one embodiment, the Alert Dispatch Module supports delivery of push notifications to caregiver mobile devices via a push notification service (e.g., Firebase Cloud Messaging or equivalent), enabling alert delivery even when the caregiver's email client is not actively monitored.

The multi-pathway architecture ensures that alert delivery is not dependent on any single communication service, maximizing the probability of timely caregiver notification in safety-critical situations.

### 10. Additional Embodiments

**Dedicated Hardware Device:** In one embodiment, the software system is deployed on a purpose-built dedicated hardware communication device. The device comprises: a single-board computer or system-on-chip processor running a Linux-based or equivalent operating system; a touchscreen display of between 7 and 13 inches diagonal; non-volatile flash storage for application data and symbol libraries; wireless network connectivity (Wi-Fi 802.11 and/or cellular LTE/5G); a rechargeable battery system with power management circuitry; a ruggedized and waterproof or water-resistant outer enclosure; and a mounting interface compatible with standard wheelchair mounting systems, desk stands, and communication board mounts.

The dedicated hardware device further includes one or more of: an integrated or externally-connected eye-tracking sensor connected via USB, I2C, or equivalent interface; a speaker and audio amplifier for text-to-speech output; a front-facing camera usable for webcam-based gaze estimation; physical access control features including a lockable housing; and near-field communication (NFC) or barcode reader capability for rapid user profile switching in multi-user clinical environments.

The dedicated hardware device runs the software system described herein in a kiosk-mode or full-screen environment, optionally with a locked-down operating system configuration that prevents access to non-AAC applications, providing a secure and purpose-dedicated communication device suitable for non-supervised use by vulnerable individuals.

**Subscription and Access Tiers:** In one embodiment, the system is offered under multiple subscription tiers for different user types, including individual family users, clinical practitioners managing multiple AAC users, and institutional users (e.g., schools, therapy clinics, hospital systems), with tiered pricing and feature access corresponding to the user type.

**Offline Operation:** In one embodiment, the system operates in an offline mode using a service worker and cached application resources, enabling continued AAC communication and safety alert initiation in environments without network connectivity, with alerts queued for transmission upon connectivity restoration.

**Multi-Language Support:** In one embodiment, the symbol grid interface and safety confirmation interface are localized in multiple languages, including Spanish, to support non-English-speaking families and bilingual AAC users.

**Clinical Data Integration:** In one embodiment, the system generates and exports usage data reports for clinical practitioners, documenting symbol activation frequency, safety alert events, and vocabulary usage patterns, to support clinical assessment and AAC therapy planning.

**Voice Output:** In one embodiment, the system includes a text-to-speech engine that vocalizes selected symbols or AI-generated sentences through a device speaker or connected audio output, providing audible communication in addition to visual symbol display. The text-to-speech engine is configurable by the caregiver to select voice characteristics, speech rate, and volume level.

---

## ABSTRACT

An integrated safety communication system for augmentative and alternative communication (AAC) applications detects activation of safety-related symbols by a nonverbal or minimally verbal user, presents a sequential two-step confirmation interface with an auto-dismissing timer to prevent false positive alerts, and upon confirmed activation dispatches an emergency alert to a designated caregiver via a primary electronic messaging pathway with automatic fallback to a secondary pathway. The system is implemented in software and operates across all input modalities including touch, switch access, and eye-tracking hardware and software without modification, achieving device-agnostic compatibility that enables access on commodity hardware without proprietary eye-tracking equipment. A PIN-gated caregiver configuration interface secures alert recipient settings and is enforced during application onboarding before initial use.

---

*Provisional Patent Application — Logan J. Snell, Inventor*
*Speak AAC LLC — 305 Park Avenue, Axtell, Kansas 66403*
*Filing Date: May 1, 2026*
