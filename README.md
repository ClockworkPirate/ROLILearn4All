# ROLI Practice

A browser MIDI player with a falling-note preview and ROLI Piano key lighting. Files are read locally. No Ableton or build step is required.

From this directory run `npm start`, then open http://localhost:8765 in desktop Chrome. Connect the Piano over USB, click **Connect ROLI Piano**, grant MIDI permission, load a `.mid` file and press Play. The ROLI driver may still be required. Close Ableton or disable its ROLI control surface while using this player to prevent competing lighting commands.

Track checkboxes select both the visual notes and hardware lights. Piano audio is enabled by default. After connecting, select the keyboard input to hear live notes with velocity and sustain support. Playback speed, seek, pause and stop clear queued MIDI and active lights. Playback pauses when the tab is hidden. The demo works without hardware.

The player uses the exact channel 1 note-on (`90 pitch 7F`) / note-off (`80 pitch 00`) lighting method from `src/ROLI_for_Live/playing_notes.py`. It leaves the Piano's saved lighting configuration alone, so no SysEx permission is needed. Hardware behaviour in the browser still needs verification on a connected Piano. Lights follow MIDI note durations; sustain pedal events are currently ignored. The display includes all pitches in selected tracks; only notes in the Piano's current octave range can light physical keys. Track colours are used in the preview; hardware note feedback is white.

Supported files: Standard MIDI formats 0 and 1, PPQ timing, tempo changes and running status. Format 2 and SMPTE timing report an error. Embedded SysEx and other file commands are never forwarded to hardware. For online hosting, serve `index.html`, `style.css`, `app.js`, `midi.js`, `piano.js`, and `lights.js` over HTTPS, or run the included Node server.

Run `npm test` for timing, parsing and overlapping-note checks.

## Production deployment

Source is maintained at https://github.com/ClockworkPirate/ROLILearn4All. Push changes to `main` to trigger the configured Heroku GitHub integration for `rolilearn4all`. GitHub Actions runs the test suite on pushes and pull requests. Production is https://rolilearn4all-a42b865ad096.herokuapp.com/.

Use `git push origin main` for releases. Heroku builds directly from GitHub; there is no need to push to its Git remote. The server uses Heroku's assigned `PORT` and the `web` process declared in `Procfile`.
