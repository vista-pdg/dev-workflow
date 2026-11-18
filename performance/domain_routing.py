"""Optional process-local DNS routing during propagation; HTTPS Host/SNI remain unchanged."""
import socket


def use_firebase_origin():
    original = socket.getaddrinfo
    evidence = {"mode": "firebase-origin-during-dns-propagation", "hostname": "vista.kuros.work",
                "resolveTo": "vista-pdg.web.app", "addresses": []}

    def resolve(host, port, *args, **kwargs):
        if host in ("vista.kuros.work", b"vista.kuros.work"):
            answers = original("vista-pdg.web.app", port, *args, **kwargs)
            evidence["addresses"] = sorted(set(evidence["addresses"]) | {a[4][0] for a in answers})
            return answers
        return original(host, port, *args, **kwargs)

    socket.getaddrinfo = resolve
    return evidence
