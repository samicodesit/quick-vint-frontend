# Batch Computer Upload Design

## Goal

Let users start the existing batch workflow with photos from either a phone or
their current computer, without adding another chooser screen. The UI must feel
clean, modern, and immediately understandable.

Item grouping remains manual. Folder names and folder boundaries never create
or suggest listing groups.

## Entry and Layout

The existing `Phone` button and its `1 item` / `Multiple items` chooser remain
unchanged. Choosing `Multiple items` opens the batch modal directly.

The initial batch modal shows both sources at once:

- **Phone:** the existing QR code is visible immediately, with short scan copy.
- **This computer:** one drop zone accepts loose image files, folders, or a mix
  of both. It contains a primary `Choose photos` action and a quieter
  `Choose folder` action because Chromium requires separate native picker modes.

There is no additional source-selection modal. Desktop uses a balanced
two-column layout; narrow screens stack the same panels. Copy stays brief and
the existing batch header and close action remain.

## Interaction

Computer input supports three equivalent actions:

1. Drop one or more image files.
2. Drop a folder; traverse it recursively and collect its image files.
3. Use either native picker: multiple files or one folder.

Loose files retain picker/drop order. Folder contents are naturally sorted by
relative path for deterministic presentation. Relative paths are otherwise
discarded. After selection, the UI reports compression/upload progress and
then opens the existing `Organize items` screen with every photo ungrouped.

The first source that starts transferring photos owns the batch session. When
computer upload starts, phone polling stops and the unused QR session is
cleaned up. When phone photos begin arriving, computer controls become
unavailable. This prevents filename/order collisions and accidental mixed
uploads.

## Data Flow

Computer files reuse the existing image compression, bounded-concurrency
temporary upload, signed-URL listing, batch grouping, generation, and cleanup
paths:

1. Validate and flatten the selected images.
2. Upload them to a fresh temporary batch session in selection order.
3. Fetch the session's ordered signed URLs.
4. Populate the existing batch remote-file state and mark receipt complete.
5. Render the existing manual grouping screen.
6. Generate each group through the unchanged batch worker, using temporary
   storage URLs as the trusted generation source.

No new API endpoint, dependency, automatic grouping algorithm, or alternate
generation pipeline is introduced.

## Errors and Recovery

- An empty or unsupported selection leaves the source screen open and shows a
  concise message.
- The organizer opens only after every accepted image has uploaded and the
  ordered signed-URL list is complete.
- A partial upload failure leaves the source screen available for retry and
  does not start generation.
- Closing the modal during selection/upload uses the existing close warning
  and temporary-session cleanup behavior.
- Existing authentication, capacity, and generation-limit checks remain.

## Verification and Refinement

Focused browser coverage will prove:

- the batch source screen shows the QR and computer drop zone without another
  chooser;
- loose-file selection reaches the existing organizer;
- folder selection is wired through a directory-capable input and reaches the
  same flattening path;
- computer-uploaded batches generate from temporary storage URLs;
- unsupported selections and failed uploads do not enter the organizer;
- phone batch behavior remains unchanged.

Run the complete frontend test suite and production build. Inspect screenshots
at desktop and mobile widths, then refine spacing, hierarchy, responsive
stacking, progress feedback, focus states, and overflow before presenting the
result. Do not push until the user reviews the finished UI.
