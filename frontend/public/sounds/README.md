# Quiz sound effects

Drop the following mp3 files in this directory. Missing files are ignored
at runtime (the play client swallows the 404), so features continue to
work without audio while assets are being produced.

| File            | When it fires                                     | Suggested length |
|-----------------|----------------------------------------------------|------------------|
| `correct.mp3`   | Student answers correctly                          | ~0.4s chime      |
| `wrong.mp3`     | Student answers incorrectly                        | ~0.4s soft buzz  |
| `streak.mp3`    | Streak reaches 5 / 10 / 15 consecutive correct     | ~0.6s flourish   |
| `tick.mp3`      | Last 5 seconds of the per-question timer           | ~0.1s tick       |
| `complete.mp3`  | Quiz finishes (right before results route change)  | ~1.2s fanfare    |

Keep each file under ~50 KB and encode at a low bitrate (64–96 kbps mono).
Users can mute sounds entirely from the play-screen header — the preference
is persisted in localStorage as `quiz.soundEnabled`.
