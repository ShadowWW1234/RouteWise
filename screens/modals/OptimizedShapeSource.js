import React from 'react';
import MapboxGL from '@rnmapbox/maps';

const OptimizedShapeSource = React.memo(({ id, shape, children }) => (
    <MapboxGL.ShapeSource id={id} shape={shape}>
        {children}
    </MapboxGL.ShapeSource>
));

export default OptimizedShapeSource;