/*
 * Число элементов заведомо известно, и лишь уменьшается со временем
 * Т.к. весь объем данных в итоге будет освобожден, то можно не растягивать этот процесс и использовать массив
 * Который будет освобожден в конце целиком
 * Список в массиве будет создаваться с помощью индексов
 * 
 * Всего нужно 2 слоя
 * Слой всех элементов
 * И слой стыков
 * Причем слой стыков не обязательно должен быть упорядочен
 * То есть новые элементы будут добавляться в конец - это избавляет от необходимости искать правильное место
 * 
 * ==============================================
 * 
 * 2 layers required, let them be:
 * 0 - all vertices
 * 1 - all inflections
 * The inflections-layers doesn't have to be ordered, so that new elements can be simply appended
 * without searching for a right place
 */

const INDEX_INVALID = Number.MAX_SAFE_INTEGER;
const NEIGHBOR_PREVIOUS = 0
const NEIGHBOR_NEXT = 1;

function polyVertexListElementLayerData(previous = INDEX_INVALID, next = INDEX_INVALID) {
    return {
        neighbor: [previous, next],

        previous: function () {
            return this.neighbor[NEIGHBOR_PREVIOUS];
        },

        next: function () {
            return this.neighbor[NEIGHBOR_NEXT];
        }
    }
}

function polyVertexListElement(previousInLayer0, nextInLayer0) {
    return {
        inLayer: [
            new polyVertexListElementLayerData(previousInLayer0, nextInLayer0),
            new polyVertexListElementLayerData()
            ],
    };
}

function polyVertexList(vertexCount) {
    let entity = {
        indices: [],
        firstInLayer: [0, INDEX_INVALID],

        lastInLayer: function (layerIndex) {
            return this.indices[this.firstInLayer[layerIndex]].inLayer[layerIndex].previous();
        },

        registerInflection: function (index) {
            if (this.firstInLayer[1] != INDEX_INVALID) {
                this.indices[index].inLayer[1].neighbor[NEIGHBOR_PREVIOUS] = this.lastInLayer(1);
                this.indices[index].inLayer[1].neighbor[NEIGHBOR_NEXT] = this.firstInLayer[1];
                this.indices[this.lastInLayer(1)].inLayer[1].neighbor[NEIGHBOR_NEXT] = index;
                this.indices[this.firstInLayer[1]].inLayer[1].neighbor[NEIGHBOR_PREVIOUS] = index;
            } else {
                this.firstInLayer[1] = index;
                this.indices[index].inLayer[1].neighbor[NEIGHBOR_PREVIOUS] = index;
                this.indices[index].inLayer[1].neighbor[NEIGHBOR_NEXT] = index;
            }
        },

        unregisterInflection: function (index) {
            //is given element the only in layer?
            if (this.indices[index].inLayer[1].previous() != index && this.indices[index].inLayer[1].next() != index) {
                //unregister ordinary element
                this.indices[this.indices[index].inLayer[1].previous()].inLayer[1].neighbor[NEIGHBOR_NEXT] = this.indices[index].inLayer[1].next();
                this.indices[this.indices[index].inLayer[1].next()].inLayer[1].neighbor[NEIGHBOR_PREVIOUS] = this.indices[index].inLayer[1].previous();
                //extra steps for the header-element
                if (index == this.firstInLayer[1]) {
                    this.firstInLayer[1] = this.indices[index].inLayer[1].next();
                }
            } else {
                //unregister the only, therefore the last element
                this.firstInLayer[1] = INDEX_INVALID;
            }
            this.indices[index].inLayer[1].neighbor[NEIGHBOR_PREVIOUS] = INDEX_INVALID;
        },

        vertexRegisteredAsInflection: function(index){
            return this.indices[index].inLayer[1].previous() != INDEX_INVALID;
        },

        remove: function (index) {
            if (this.indices[index].inLayer[0].next() != this.indices[index].inLayer[0].previous()) {
                //unregister ordinary element
                this.indices[this.indices[index].inLayer[0].previous()].inLayer[0].neighbor[NEIGHBOR_NEXT] = this.indices[index].inLayer[0].next();
                this.indices[this.indices[index].inLayer[0].next()].inLayer[0].neighbor[NEIGHBOR_PREVIOUS] = this.indices[index].inLayer[0].previous();
                //extra steps for the header-element
                if (index == this.firstInLayer[0]) {
                    this.firstInLayer[0] = this.indices[index].inLayer[0].next();
                }
            } else {
                //unregister the only, therefore the last element
                this.firstInLayer[0] = INDEX_INVALID;
            }
            if (this.indices[index].inLayer[1].previous() != INDEX_INVALID) {
                this.unregisterInflection(index);
            }
        },
    };

    entity.indices.length = vertexCount;
    entity.indices[0] = new polyVertexListElement(vertexCount - 1, 1);
    for (let i = 1; i < vertexCount - 1; i++) {
        entity.indices[i] = new polyVertexListElement(i - 1, i + 1);
    }
    entity.indices[vertexCount - 1] = new polyVertexListElement(vertexCount - 2, 0);

    return entity;
}