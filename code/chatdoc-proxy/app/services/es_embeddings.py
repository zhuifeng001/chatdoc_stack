from app.services.es import global_es
from app.config import config
from app.objects.vector import VectorEntity, PersonalVectorEntity


def insert_entities(ins_entities: list[VectorEntity]):
    global_es.bulk_update_embeddings(
        index=config["es"]["index_doc_fragment"],
        items=[
            {
                "uuid": entity.uuid,
                "embedding": entity.vector
            }
            for entity in ins_entities
        ]
    )


def insert_personal_entities(ins_entities: list[PersonalVectorEntity]):
    global_es.bulk_update_embeddings(
        index=config["es"]["index_p_doc_fragment"],
        items=[
            {
                "uuid": entity.uuid,
                "embedding": entity.vector
            }
            for entity in ins_entities
        ]
    )
