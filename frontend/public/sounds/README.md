# Quiz sound effects

Files served from `/sounds/<name>.mp3`. Missing files are ignored at runtime
(the play client swallows the rejection / 404), so the feature continues to
work without audio while assets are being produced.

| File              | When it fires                                       | Suggested length        |
|-------------------|------------------------------------------------------|-------------------------|
| `lobby-loop.mp3`  | Live mode lobby (looping, until host starts game)    | ~30s ambient loop       |
| `ticktock.mp3`    | Last 10s of the per-question timer (looping)         | ~10s                    |
| `correct.mp3`     | Student answers correctly                            | ~0.4s ding              |
| `wrong.mp3`       | Student answers incorrectly                          | ~0.4s soft buzz         |
| `streak.mp3`      | Streak reaches 3, 5, 10 consecutive correct          | ~1s flourish            |
| `complete.mp3`    | Quiz finishes (right before results route change)    | ~1.2s fanfare (optional)|

The current files are synthesised stand-ins; replace with curated assets
when ready (Pixabay sound effects, Mixkit, freesound.org, or AI generators
like ElevenLabs sound effects).

User preferences are persisted under:

- `soundVolume` — number `0`-`1`, default `0.5`
- `soundMuted`  — `"1"` or `"0"`

Browser autoplay policy: the hook queues the first `play()` until a user
interaction (pointer/keyboard/touch) and then drains the queue, so callers
do not need to handle the rejection themselves.
