import base64
import json
import os
import threading
import time
import unittest
from pathlib import Path
from urllib.request import Request, urlopen

from agclaw_backend.http_api import create_server


def _enabled() -> bool:
    return os.getenv("AGCLAW_LIVE_VISION_TESTS") == "1"


@unittest.skipUnless(_enabled(), "Set AGCLAW_LIVE_VISION_TESTS=1 to run live local vision checks.")
class LiveVisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._previous_env = {
            "AGCLAW_SCREEN_VISION_PROVIDER": os.getenv("AGCLAW_SCREEN_VISION_PROVIDER"),
            "AGCLAW_SCREEN_VISION_BASE_URL": os.getenv("AGCLAW_SCREEN_VISION_BASE_URL"),
            "AGCLAW_SCREEN_VISION_API_KEY": os.getenv("AGCLAW_SCREEN_VISION_API_KEY"),
            "AGCLAW_SCREEN_VISION_MODEL": os.getenv("AGCLAW_SCREEN_VISION_MODEL"),
        }

        os.environ["AGCLAW_SCREEN_VISION_PROVIDER"] = os.getenv("AGCLAW_SCREEN_VISION_PROVIDER", "ollama")
        os.environ["AGCLAW_SCREEN_VISION_BASE_URL"] = os.getenv("AGCLAW_SCREEN_VISION_BASE_URL", "http://127.0.0.1:11434")
        os.environ["AGCLAW_SCREEN_VISION_API_KEY"] = os.getenv("AGCLAW_SCREEN_VISION_API_KEY", "")
        os.environ["AGCLAW_SCREEN_VISION_MODEL"] = os.getenv("AGCLAW_SCREEN_VISION_MODEL", "qwen2.5vl:3b")
        os.environ["AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS"] = os.getenv("AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS", "180")

        with urlopen("http://127.0.0.1:11434/api/tags", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        models = {item.get("name", "") for item in payload.get("models", [])}
        required_model = os.environ["AGCLAW_SCREEN_VISION_MODEL"]
        if required_model not in models:
            raise unittest.SkipTest(f"Required local vision model is not installed: {required_model}")

        cls.server = create_server(port=0)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.05)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        for key, value in cls._previous_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def _url(self, path: str) -> str:
        return f"http://127.0.0.1:{self.port}{path}"

    def test_local_vision_adapter_interprets_uploaded_hmi_image(self) -> None:
        fixture_path = Path(__file__).resolve().parent / "fixtures" / "hmi-sample.png"
        image_data_url = "data:image/png;base64," + base64.b64encode(fixture_path.read_bytes()).decode("ascii")

        request = Request(
            self._url("/api/mes/interpret-screen"),
            data=json.dumps(
                {
                    "title": "Legacy HMI Batch Screen",
                    "notes": "Alarm banner visible. Manual mode lit. Batch 10452 and CIP rinse recipe shown with quality hold.",
                    "visible_labels": ["ALARM ACTIVE", "Batch B-10452", "Recipe CIP-RINSE", "Mode MANUAL", "Quality Hold YES"],
                    "image_name": "hmi-sample.png",
                    "image_data_url": image_data_url,
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urlopen(request, timeout=600) as response:
            payload = json.loads(response.read().decode("utf-8"))

        self.assertEqual(payload["adapter"], "ollama")
        joined_observations = " ".join(payload["observations"]).lower()
        self.assertIn("vision summary", joined_observations)
        self.assertTrue("batch" in joined_observations or "recipe" in joined_observations)


if __name__ == "__main__":
    unittest.main()
