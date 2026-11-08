import type { AuthService } from './auth/auth-service';
import type { DeliveryRepository } from './deliveries/delivery-repository';
import type { DriverRepository } from './drivers/driver-repository';
import type { LocationService } from './location/location-service';
import type { MapsService } from './maps/maps-service';

export type ServiceMode = 'live' | 'mock';

/** Every integration the UI may use, provided through `ServicesProvider`. */
export type Services = {
  mode: ServiceMode;
  auth: AuthService;
  deliveries: DeliveryRepository;
  drivers: DriverRepository;
  maps: MapsService;
  location: LocationService;
};
