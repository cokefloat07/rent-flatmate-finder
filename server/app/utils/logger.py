import logging
import sys

# Configure logging to output to standard out (terminal)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# Export a named logger
logger = logging.getLogger("rent_flatmate")