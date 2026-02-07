from unittest.mock import MagicMock, patch

import pytest

from app.core.tts import AuraTTS


@pytest.fixture
def tts():
    return AuraTTS()

def test_synthesize_speech_cache_hit(tts):
    with patch("app.core.cache.explanation_cache.get") as mock_get:
        mock_get.return_value = b"cached_mp3"
        result = tts.synthesize_speech("hello")
        assert result == b"cached_mp3"
        assert mock_get.called

def test_synthesize_speech_cache_miss(tts):
    with patch("app.core.cache.explanation_cache.get", return_value=None), \
         patch("app.core.cache.explanation_cache.set") as mock_set, \
         patch("app.core.tts.gTTS") as mock_gtts:

        mock_instance = MagicMock()
        mock_gtts.return_value = mock_instance

        # Simulate writing to file pointer
        def mock_write_to_fp(fp):
            fp.write(b"generated_mp3")
        mock_instance.write_to_fp.side_effect = mock_write_to_fp

        result = tts.synthesize_speech("hello")
        assert result == b"generated_mp3"
        assert mock_set.called

def test_synthesize_speech_error(tts):
    with patch("app.core.cache.explanation_cache.get", return_value=None), \
         patch("app.core.tts.gTTS", side_effect=Exception("gTTS Error")):

        with pytest.raises(Exception, match="gTTS Error"):
            tts.synthesize_speech("hello")
